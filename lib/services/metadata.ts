import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  availabilityOffers,
  episodes,
  genres,
  seasons,
  titleGenres,
  titleRecommendations,
  titles,
} from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { generateProviderUrl } from "@/lib/providers";
import {
  getMovieDetails,
  getRecommendations,
  getSimilar,
  getTvDetails,
  getTvSeasonDetails,
  getVideos,
} from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type {
  TmdbGenre,
  TmdbMovieDetails,
  TmdbTvDetails,
  TmdbVideo,
} from "@/lib/tmdb/types";
import type {
  AvailabilityOffer,
  CastMember,
  Episode,
  ResolvedTitle,
  Season,
} from "@/lib/types/title";
import { refreshAvailability } from "./availability";
import { extractAndStoreColors, parseColorPalette } from "./colors";
import { getCastForTitle, refreshCredits } from "./credits";
import {
  cacheEpisodeStills,
  cacheImagesForTitle,
  imageCacheEnabled,
} from "./image-cache";

const log = createLogger("metadata");

/**
 * Insert a title row, or return the existing one if a concurrent insert won the race.
 * Catches SQLITE_CONSTRAINT_UNIQUE and falls back to a SELECT.
 */
function upsertTitle(values: typeof titles.$inferInsert, tmdbId: number) {
  try {
    return db.insert(titles).values(values).returning().get();
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      err.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      log.debug(`TMDB ${tmdbId} was inserted concurrently, returning existing`);
      return db.select().from(titles).where(eq(titles.tmdbId, tmdbId)).get();
    }
    throw err;
  }
}

function upsertGenres(titleId: string, tmdbGenres: TmdbGenre[]) {
  if (tmdbGenres.length === 0) return;
  db.transaction((tx) => {
    for (const g of tmdbGenres) {
      tx.insert(genres)
        .values({ id: g.id, name: g.name })
        .onConflictDoUpdate({ target: genres.id, set: { name: g.name } })
        .run();
    }
    tx.delete(titleGenres).where(eq(titleGenres.titleId, titleId)).run();
    for (const g of tmdbGenres) {
      tx.insert(titleGenres)
        .values({ titleId, genreId: g.id })
        .onConflictDoNothing()
        .run();
    }
  });
}

/** @internal */
export function extractMovieContentRating(
  movie: TmdbMovieDetails,
): string | null {
  const us = movie.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
  if (!us) return null;
  for (const rd of us.release_dates) {
    if (rd.certification) return rd.certification;
  }
  return null;
}

/** @internal */
export function extractTvContentRating(show: TmdbTvDetails): string | null {
  const us = show.content_ratings?.results?.find((r) => r.iso_3166_1 === "US");
  return us?.rating || null;
}

type ImportResult = ReturnType<typeof _getOrFetchTitleByTmdbId>;

/** In-flight import promises keyed by tmdbId — coalesces concurrent calls */
const inflightImports = new Map<number, ImportResult>();

export function getOrFetchTitleByTmdbId(
  tmdbId: number,
  type: "movie" | "tv",
): ImportResult {
  const inflight = inflightImports.get(tmdbId);
  if (inflight) {
    log.debug(`Import already in-flight for TMDB ${tmdbId}, coalescing`);
    return inflight;
  }

  const promise = _getOrFetchTitleByTmdbId(tmdbId, type).finally(() => {
    inflightImports.delete(tmdbId);
  }) as ImportResult;
  inflightImports.set(tmdbId, promise);
  return promise;
}

async function _getOrFetchTitleByTmdbId(tmdbId: number, type: "movie" | "tv") {
  log.debug(`Importing ${type} TMDB ${tmdbId}`);

  const existing = db
    .select()
    .from(titles)
    .where(eq(titles.tmdbId, tmdbId))
    .get();
  if (existing) {
    // For TV shows, check if seasons/episodes were actually loaded.
    // They may be missing if a prior fetch failed or the title was created
    // as a shell by the recommendations system (lastFetchedAt: null).
    if (existing.type === "tv") {
      const hasSeason = db
        .select({ id: seasons.id })
        .from(seasons)
        .where(eq(seasons.titleId, existing.id))
        .limit(1)
        .get();
      if (!hasSeason) {
        const show = await getTvDetails(tmdbId);
        if (!existing.lastFetchedAt) {
          db.update(titles)
            .set({
              overview: show.overview,
              posterPath: show.poster_path,
              backdropPath: show.backdrop_path,
              status: show.status,
              contentRating: extractTvContentRating(show),
              tvdbId: show.external_ids?.tvdb_id ?? null,
              lastFetchedAt: new Date(),
            })
            .where(eq(titles.id, existing.id))
            .run();
        }
        upsertGenres(existing.id, show.genres);
        await refreshTvChildren(existing.id, tmdbId, show.number_of_seasons);
        refreshAvailability(existing.id).catch((err) =>
          log.debug("Availability enrichment failed:", err),
        );
        refreshRecommendations(existing.id).catch((err) =>
          log.debug("Recommendations enrichment failed:", err),
        );
        extractAndStoreColors(existing.id, show.poster_path).catch((err) =>
          log.debug("Color extraction failed:", err),
        );
        refreshCredits(existing.id).catch((err) =>
          log.debug("Credits enrichment failed:", err),
        );
        refreshTrailer(existing.id).catch((err) =>
          log.debug("Trailer enrichment failed:", err),
        );
        if (imageCacheEnabled()) {
          cacheImagesForTitle(existing.id).catch((err) =>
            log.debug("Image caching failed:", err),
          );
          cacheEpisodeStills(existing.id).catch((err) =>
            log.debug("Episode stills caching failed:", err),
          );
        }
        return db.select().from(titles).where(eq(titles.id, existing.id)).get();
      }
    }
    return existing;
  }

  const now = new Date();

  if (type === "movie") {
    const movie = await getMovieDetails(tmdbId);
    const row = upsertTitle(
      {
        tmdbId: movie.id,
        type: "movie",
        title: movie.title,
        originalTitle: movie.original_title,
        overview: movie.overview,
        releaseDate: movie.release_date || null,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        popularity: movie.popularity,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        status: movie.status,
        contentRating: extractMovieContentRating(movie),
        lastFetchedAt: now,
      },
      tmdbId,
    );
    if (!row) return undefined;
    upsertGenres(row.id, movie.genres);
    refreshAvailability(row.id).catch((err) =>
      log.debug("Availability enrichment failed:", err),
    );
    refreshRecommendations(row.id).catch((err) =>
      log.debug("Recommendations enrichment failed:", err),
    );
    extractAndStoreColors(row.id, movie.poster_path).catch((err) =>
      log.debug("Color extraction failed:", err),
    );
    refreshCredits(row.id).catch((err) =>
      log.debug("Credits enrichment failed:", err),
    );
    refreshTrailer(row.id).catch((err) =>
      log.debug("Trailer enrichment failed:", err),
    );
    if (imageCacheEnabled()) {
      cacheImagesForTitle(row.id).catch((err) =>
        log.debug("Image caching failed:", err),
      );
    }
    log.info(`Imported movie "${movie.title}" (TMDB ${tmdbId})`);
    return row;
  }

  const show = await getTvDetails(tmdbId);
  const row = upsertTitle(
    {
      tmdbId: show.id,
      tvdbId: show.external_ids?.tvdb_id ?? null,
      type: "tv",
      title: show.name,
      originalTitle: show.original_name,
      overview: show.overview,
      firstAirDate: show.first_air_date || null,
      posterPath: show.poster_path,
      backdropPath: show.backdrop_path,
      popularity: show.popularity,
      voteAverage: show.vote_average,
      voteCount: show.vote_count,
      status: show.status,
      contentRating: extractTvContentRating(show),
      lastFetchedAt: now,
    },
    tmdbId,
  );
  if (!row) return undefined;
  upsertGenres(row.id, show.genres);

  await refreshTvChildren(row.id, tmdbId, show.number_of_seasons);
  refreshAvailability(row.id).catch((err) =>
    log.debug("Availability enrichment failed:", err),
  );
  refreshRecommendations(row.id).catch((err) =>
    log.debug("Recommendations enrichment failed:", err),
  );
  extractAndStoreColors(row.id, show.poster_path).catch((err) =>
    log.debug("Color extraction failed:", err),
  );
  refreshCredits(row.id).catch((err) =>
    log.debug("Credits enrichment failed:", err),
  );
  refreshTrailer(row.id).catch((err) =>
    log.debug("Trailer enrichment failed:", err),
  );
  if (imageCacheEnabled()) {
    cacheImagesForTitle(row.id).catch((err) =>
      log.debug("Image caching failed:", err),
    );
    cacheEpisodeStills(row.id).catch((err) =>
      log.debug("Episode stills caching failed:", err),
    );
  }
  log.info(`Imported TV show "${show.name}" (TMDB ${tmdbId})`);
  return row;
}

export async function refreshTitle(titleId: string) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title) return null;

  const now = new Date();

  if (title.type === "movie") {
    const movie = await getMovieDetails(title.tmdbId);
    db.update(titles)
      .set({
        title: movie.title,
        originalTitle: movie.original_title,
        overview: movie.overview,
        releaseDate: movie.release_date || null,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        popularity: movie.popularity,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        status: movie.status,
        contentRating: extractMovieContentRating(movie),
        lastFetchedAt: now,
      })
      .where(eq(titles.id, titleId))
      .run();
    upsertGenres(titleId, movie.genres);
  } else {
    const show = await getTvDetails(title.tmdbId);
    db.update(titles)
      .set({
        title: show.name,
        originalTitle: show.original_name,
        overview: show.overview,
        firstAirDate: show.first_air_date || null,
        posterPath: show.poster_path,
        backdropPath: show.backdrop_path,
        popularity: show.popularity,
        voteAverage: show.vote_average,
        voteCount: show.vote_count,
        status: show.status,
        contentRating: extractTvContentRating(show),
        tvdbId: show.external_ids?.tvdb_id ?? null,
        lastFetchedAt: now,
      })
      .where(eq(titles.id, titleId))
      .run();
    upsertGenres(titleId, show.genres);
    await refreshTvChildren(titleId, title.tmdbId, show.number_of_seasons);
  }

  const updated = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (updated) {
    extractAndStoreColors(updated.id, updated.posterPath).catch((err) =>
      log.debug("Color extraction failed:", err),
    );
    refreshTrailer(updated.id).catch((err) =>
      log.debug("Trailer enrichment failed:", err),
    );
    refreshCredits(updated.id).catch((err) =>
      log.debug("Credits enrichment failed:", err),
    );
    if (imageCacheEnabled()) {
      cacheImagesForTitle(updated.id).catch((err) =>
        log.debug("Image caching failed:", err),
      );
      if (updated.type === "tv") {
        cacheEpisodeStills(updated.id).catch((err) =>
          log.debug("Episode stills caching failed:", err),
        );
      }
    }
  }
  return updated;
}

export async function refreshTvChildren(
  titleId: string,
  tmdbId: number,
  numberOfSeasons: number,
) {
  const now = new Date();

  for (let sn = 1; sn <= numberOfSeasons; sn++) {
    // Rate-limit: 250ms between TMDB calls
    if (sn > 1) await delay(250);

    try {
      const seasonData = await getTvSeasonDetails(tmdbId, sn);

      const seasonRow = db
        .insert(seasons)
        .values({
          titleId,
          seasonNumber: seasonData.season_number,
          name: seasonData.name,
          overview: seasonData.overview,
          posterPath: seasonData.poster_path,
          airDate: seasonData.air_date,
          lastFetchedAt: now,
        })
        .onConflictDoUpdate({
          target: [seasons.titleId, seasons.seasonNumber],
          set: {
            name: seasonData.name,
            overview: seasonData.overview,
            posterPath: seasonData.poster_path,
            airDate: seasonData.air_date,
            lastFetchedAt: now,
          },
        })
        .returning()
        .get();

      // Batch all episode upserts in a single transaction per season
      if (seasonData.episodes.length > 0) {
        db.transaction((tx) => {
          for (const ep of seasonData.episodes) {
            tx.insert(episodes)
              .values({
                seasonId: seasonRow.id,
                episodeNumber: ep.episode_number,
                name: ep.name,
                overview: ep.overview,
                stillPath: ep.still_path,
                airDate: ep.air_date,
                runtimeMinutes: ep.runtime,
              })
              .onConflictDoUpdate({
                target: [episodes.seasonId, episodes.episodeNumber],
                set: {
                  name: ep.name,
                  overview: ep.overview,
                  stillPath: ep.still_path,
                  airDate: ep.air_date,
                  runtimeMinutes: ep.runtime,
                },
              })
              .run();
          }
        });
      }
    } catch (err) {
      // Skip this season and continue with the rest — partial data is
      // better than aborting entirely. The next refresh cycle will retry.
      log.error(`Failed to fetch season ${sn} for TMDB ${tmdbId}:`, err);
    }
  }
}

export async function refreshRecommendations(titleId: string) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title) return;

  const now = new Date();

  // Fetch both recommendations and similar
  const [recs, similar] = await Promise.all([
    getRecommendations(title.tmdbId, title.type),
    getSimilar(title.tmdbId, title.type),
  ]);

  log.debug(
    `Fetched ${recs.results.length} recommendations and ${similar.results.length} similar for title ${titleId}`,
  );

  // Collect all valid results with their source/rank
  interface RecItem {
    result: (typeof recs.results)[0];
    type: "movie" | "tv";
    source: "tmdb_recommendations" | "tmdb_similar";
    rank: number;
  }
  const allItems: RecItem[] = [];
  for (let i = 0; i < recs.results.length && i < 20; i++) {
    const r = recs.results[i];
    const type = r.media_type ?? title.type;
    if (type === "movie" || type === "tv") {
      allItems.push({
        result: r,
        type,
        source: "tmdb_recommendations",
        rank: i + 1,
      });
    }
  }
  for (let i = 0; i < similar.results.length && i < 20; i++) {
    const r = similar.results[i];
    const type = r.media_type ?? title.type;
    if (type === "movie" || type === "tv") {
      allItems.push({ result: r, type, source: "tmdb_similar", rank: i + 1 });
    }
  }

  if (allItems.length === 0) return;

  // Batch prefetch existing titles (1 query)
  const tmdbIds = [...new Set(allItems.map((item) => item.result.id))];
  const existingTitles = db
    .select({ id: titles.id, tmdbId: titles.tmdbId })
    .from(titles)
    .where(inArray(titles.tmdbId, tmdbIds))
    .all();
  const titleIdMap = new Map<number, string>(
    existingTitles.map((t) => [t.tmdbId, t.id]),
  );

  // Insert missing titles + upsert recommendations in a single transaction
  db.transaction((tx) => {
    // Insert only new titles
    const newItems = allItems.filter((item) => !titleIdMap.has(item.result.id));
    const insertedTmdbIds = new Set<number>();
    for (const item of newItems) {
      if (insertedTmdbIds.has(item.result.id)) continue;
      insertedTmdbIds.add(item.result.id);
      const r = item.result;
      const row = tx
        .insert(titles)
        .values({
          tmdbId: r.id,
          type: item.type,
          title: r.title ?? r.name ?? "Unknown",
          originalTitle: r.original_title ?? r.original_name,
          overview: r.overview,
          releaseDate: r.release_date,
          firstAirDate: r.first_air_date,
          posterPath: r.poster_path,
          backdropPath: r.backdrop_path,
          popularity: r.popularity,
          voteAverage: r.vote_average,
          voteCount: r.vote_count,
          lastFetchedAt: null,
        })
        .onConflictDoNothing()
        .returning()
        .get();
      if (row) titleIdMap.set(r.id, row.id);
    }

    // One fallback query for any that conflicted
    const stillMissing = [...insertedTmdbIds].filter(
      (id) => !titleIdMap.has(id),
    );
    if (stillMissing.length > 0) {
      const fallbacks = tx
        .select({ id: titles.id, tmdbId: titles.tmdbId })
        .from(titles)
        .where(inArray(titles.tmdbId, stillMissing))
        .all();
      for (const f of fallbacks) titleIdMap.set(f.tmdbId, f.id);
    }

    // Batch upsert all recommendation rows (N inserts → 1)
    const recRows = allItems
      .map((item) => {
        const recTitleId = titleIdMap.get(item.result.id);
        if (!recTitleId) return null;
        return {
          titleId,
          recommendedTitleId: recTitleId,
          source: item.source,
          rank: item.rank,
          lastFetchedAt: now,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (recRows.length > 0) {
      tx.insert(titleRecommendations)
        .values(recRows)
        .onConflictDoUpdate({
          target: [
            titleRecommendations.titleId,
            titleRecommendations.recommendedTitleId,
            titleRecommendations.source,
          ],
          set: {
            rank: sql`excluded.rank`,
            lastFetchedAt: sql`excluded.lastFetchedAt`,
          },
        })
        .run();
    }
  });
}

/** Fetch seasons from the DB, building the Season[] structure. */
function fetchSeasonsFromDb(titleId: string): Season[] {
  const seasonRows = db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .orderBy(seasons.seasonNumber)
    .all();

  if (seasonRows.length === 0) return [];

  const seasonIds = seasonRows.map((s) => s.id);
  const allEps = db
    .select()
    .from(episodes)
    .where(inArray(episodes.seasonId, seasonIds))
    .orderBy(episodes.seasonId, episodes.episodeNumber)
    .all();

  const epsBySeason = new Map<string, Episode[]>();
  for (const ep of allEps) {
    const arr = epsBySeason.get(ep.seasonId) ?? [];
    arr.push({
      id: ep.id,
      episodeNumber: ep.episodeNumber,
      name: ep.name,
      overview: ep.overview,
      stillPath: tmdbImageUrl(ep.stillPath, "w1280", "stills"),
      airDate: ep.airDate,
      runtimeMinutes: ep.runtimeMinutes,
    });
    epsBySeason.set(ep.seasonId, arr);
  }

  return seasonRows.map((s) => ({
    id: s.id,
    seasonNumber: s.seasonNumber,
    name: s.name,
    episodes: epsBySeason.get(s.id) ?? [],
  }));
}

/**
 * Ensure a TV title is fully hydrated (seasons/episodes fetched from TMDB).
 * Returns the hydrated seasons data.
 */
export async function ensureTvHydrated(
  titleId: string,
  tmdbId: number,
): Promise<Season[]> {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title || title.type !== "tv") return [];

  // Shell title: fetch details + children
  if (!title.lastFetchedAt) {
    try {
      const show = await getTvDetails(tmdbId);
      db.update(titles)
        .set({
          overview: show.overview,
          posterPath: show.poster_path,
          backdropPath: show.backdrop_path,
          status: show.status,
          contentRating: extractTvContentRating(show),
          lastFetchedAt: new Date(),
        })
        .where(eq(titles.id, titleId))
        .run();
      upsertGenres(titleId, show.genres);
      await refreshTvChildren(titleId, tmdbId, show.number_of_seasons);
    } catch (err) {
      log.debug(`Failed to hydrate shell TV title ${titleId}:`, err);
    }
  }

  let result = fetchSeasonsFromDb(titleId);

  // Retry hydration when seasons are still missing
  if (result.length === 0) {
    try {
      const show = await getTvDetails(tmdbId);
      await refreshTvChildren(titleId, tmdbId, show.number_of_seasons);
      result = fetchSeasonsFromDb(titleId);
    } catch (err) {
      log.debug(
        `Failed to backfill missing seasons for title ${titleId}:`,
        err,
      );
    }
  }

  return result;
}

/**
 * Ensure a title has all enrichment data. Accepts already-read data to avoid
 * redundant queries — only does lightweight existence checks for data not
 * already loaded (recommendations). Returns true if any work was performed.
 */
async function ensureEnriched(
  titleId: string,
  title: typeof titles.$inferSelect,
  existing: { hasCast: boolean; hasAvailability: boolean },
): Promise<boolean> {
  const tasks: Promise<void>[] = [];

  if (!existing.hasCast) {
    tasks.push(
      refreshCredits(titleId).catch((err) =>
        log.debug("Credits enrichment failed:", err),
      ),
    );
  }

  if (!existing.hasAvailability) {
    tasks.push(
      refreshAvailability(titleId).catch((err) =>
        log.debug("Availability enrichment failed:", err),
      ),
    );
  }

  // Recommendations are loaded separately (Suspense), so check here
  const hasRecommendations =
    db
      .select({ titleId: titleRecommendations.titleId })
      .from(titleRecommendations)
      .where(eq(titleRecommendations.titleId, titleId))
      .limit(1)
      .get() != null;
  if (!hasRecommendations) {
    tasks.push(
      refreshRecommendations(titleId).catch((err) =>
        log.debug("Recommendations enrichment failed:", err),
      ),
    );
  }

  if (!title.colorPalette && title.posterPath) {
    tasks.push(
      extractAndStoreColors(titleId, title.posterPath).then(
        () => {},
        (err) => log.debug("Color enrichment failed:", err),
      ),
    );
  }

  if (!title.trailerVideoKey) {
    tasks.push(
      refreshTrailer(titleId).catch((err) =>
        log.debug("Trailer enrichment failed:", err),
      ),
    );
  }

  if (tasks.length > 0) {
    log.debug(
      `Backfilling ${tasks.length} enrichment task(s) for "${title.title}"`,
    );
    await Promise.all(tasks);
    return true;
  }
  return false;
}

function readAvailability(
  titleId: string,
  titleName: string,
): AvailabilityOffer[] {
  return db
    .select()
    .from(availabilityOffers)
    .where(eq(availabilityOffers.titleId, titleId))
    .all()
    .map((a) => ({
      providerId: a.providerId,
      providerName: a.providerName,
      logoPath: tmdbImageUrl(a.logoPath, "w92"),
      offerType: a.offerType,
      watchUrl: generateProviderUrl(a.providerId, titleName),
    }));
}

export async function getOrFetchTitle(id: string): Promise<{
  title: ResolvedTitle;
  seasons: Season[];
  needsHydration: boolean;
  availability: AvailabilityOffer[];
  cast: CastMember[];
} | null> {
  let title = db.select().from(titles).where(eq(titles.id, id)).get();
  if (!title) return null;

  // For TV titles, check if seasons need hydration (reuse result below)
  const existingSeasons =
    title.type === "tv" && title.lastFetchedAt ? fetchSeasonsFromDb(id) : null;
  const needsTvHydration =
    title.type === "tv" &&
    (!title.lastFetchedAt || existingSeasons?.length === 0);

  // If this is a shell movie title, fetch full details now (movies are fast)
  if (title.type === "movie" && !title.lastFetchedAt) {
    try {
      const movie = await getMovieDetails(title.tmdbId);
      db.update(titles)
        .set({
          title: movie.title,
          originalTitle: movie.original_title,
          overview: movie.overview,
          releaseDate: movie.release_date || null,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          popularity: movie.popularity,
          voteAverage: movie.vote_average,
          voteCount: movie.vote_count,
          status: movie.status,
          contentRating: extractMovieContentRating(movie),
          lastFetchedAt: new Date(),
        })
        .where(eq(titles.id, id))
        .run();
      upsertGenres(id, movie.genres);
      title = db.select().from(titles).where(eq(titles.id, id)).get() ?? title;
    } catch (err) {
      log.debug(`Failed to hydrate shell movie title ${id}:`, err);
    }
  }

  const titleSeasons = needsTvHydration ? [] : (existingSeasons ?? []);

  // Read enrichment data, then backfill anything missing
  let availability = readAvailability(title.id, title.title);
  let cast = getCastForTitle(id);

  if (title.lastFetchedAt) {
    const enriched = await ensureEnriched(id, title, {
      hasCast: cast.length > 0,
      hasAvailability: availability.length > 0,
    });
    if (enriched) {
      // Re-read only what was missing
      if (cast.length === 0) cast = getCastForTitle(id);
      if (availability.length === 0)
        availability = readAvailability(title.id, title.title);
      title = db.select().from(titles).where(eq(titles.id, id)).get() ?? title;
    }
  }

  const palette = parseColorPalette(title.colorPalette);

  const titleGenreRows = db
    .select({ name: genres.name })
    .from(titleGenres)
    .innerJoin(genres, eq(titleGenres.genreId, genres.id))
    .where(eq(titleGenres.titleId, id))
    .all();

  const resolvedTitle: ResolvedTitle = {
    id: title.id,
    tmdbId: title.tmdbId,
    type: title.type as "movie" | "tv",
    title: title.title,
    originalTitle: title.originalTitle,
    overview: title.overview,
    releaseDate: title.releaseDate,
    firstAirDate: title.firstAirDate,
    posterPath: tmdbImageUrl(title.posterPath, "w500"),
    backdropPath: tmdbImageUrl(title.backdropPath, "w1280"),
    popularity: title.popularity,
    voteAverage: title.voteAverage,
    voteCount: title.voteCount,
    status: title.status,
    contentRating: title.contentRating,
    colorPalette: palette,
    trailerVideoKey: title.trailerVideoKey,
    genres: titleGenreRows.map((r) => r.name),
  };

  return {
    title: resolvedTitle,
    seasons: titleSeasons,
    needsHydration: needsTvHydration,
    availability,
    cast,
  };
}

export function pickBestTrailer(videos: TmdbVideo[]): string | null {
  let candidates = videos.filter((v) => v.site === "YouTube");
  if (candidates.length === 0) return null;

  // Prefer English, fall back to any language
  const english = candidates.filter((v) => v.iso_639_1 === "en");
  if (english.length > 0) candidates = english;

  const byDate = (a: TmdbVideo, b: TmdbVideo) =>
    (b.published_at ?? "").localeCompare(a.published_at ?? "");

  // Tier 1: official trailers
  const officialTrailers = candidates
    .filter((v) => v.official && v.type === "Trailer")
    .sort(byDate);
  if (officialTrailers.length > 0) return officialTrailers[0].key;

  // Tier 2: any trailer
  const trailers = candidates.filter((v) => v.type === "Trailer").sort(byDate);
  if (trailers.length > 0) return trailers[0].key;

  // Tier 3: teasers
  const teasers = candidates.filter((v) => v.type === "Teaser").sort(byDate);
  if (teasers.length > 0) return teasers[0].key;

  return null;
}

export async function refreshTrailer(titleId: string) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title) return;

  try {
    const response = await getVideos(title.tmdbId, title.type);
    const key = pickBestTrailer(response.results);
    db.update(titles)
      .set({ trailerVideoKey: key })
      .where(eq(titles.id, titleId))
      .run();
    log.debug(
      `Trailer for "${title.title}": ${key ? `YouTube ${key}` : "none found"}`,
    );
  } catch (err) {
    log.debug(`Failed to fetch trailer for title ${titleId}:`, err);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
