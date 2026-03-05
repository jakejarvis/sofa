import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  availabilityOffers,
  episodes,
  seasons,
  titleRecommendations,
  titles,
} from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import {
  getMovieDetails,
  getRecommendations,
  getSimilar,
  getTvDetails,
  getTvSeasonDetails,
} from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type {
  AvailabilityOffer,
  Episode,
  ResolvedTitle,
  Season,
} from "@/lib/types/title";
import { refreshAvailability } from "./availability";
import { extractAndStoreColors, parseColorPalette } from "./colors";
import {
  cacheEpisodeStills,
  cacheImagesForTitle,
  imageCacheEnabled,
} from "./image-cache";

const log = createLogger("metadata");

export async function importTitle(
  tmdbId: number,
  type: "movie" | "tv",
  options?: { awaitEnrichment?: boolean },
) {
  const awaitEnrichment = options?.awaitEnrichment ?? false;
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
      const seasonCount = db
        .select()
        .from(seasons)
        .where(eq(seasons.titleId, existing.id))
        .all().length;
      if (seasonCount === 0) {
        const show = await getTvDetails(tmdbId);
        if (!existing.lastFetchedAt) {
          db.update(titles)
            .set({
              overview: show.overview,
              posterPath: show.poster_path,
              backdropPath: show.backdrop_path,
              status: show.status,
              lastFetchedAt: new Date(),
            })
            .where(eq(titles.id, existing.id))
            .run();
        }
        await refreshTvChildren(existing.id, tmdbId, show.number_of_seasons);
        if (awaitEnrichment) {
          await Promise.all([
            refreshAvailability(existing.id).catch(() => {}),
            refreshRecommendations(existing.id).catch(() => {}),
            extractAndStoreColors(existing.id, show.poster_path).catch(
              () => {},
            ),
          ]);
        } else {
          refreshAvailability(existing.id).catch(() => {});
          refreshRecommendations(existing.id).catch(() => {});
        }
        if (imageCacheEnabled()) {
          cacheImagesForTitle(existing.id).catch(() => {});
          cacheEpisodeStills(existing.id).catch(() => {});
        }
        return db.select().from(titles).where(eq(titles.id, existing.id)).get();
      }
    }
    return existing;
  }

  const now = new Date();

  if (type === "movie") {
    const movie = await getMovieDetails(tmdbId);
    const row = db
      .insert(titles)
      .values({
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
        lastFetchedAt: now,
      })
      .returning()
      .get();
    if (awaitEnrichment) {
      await Promise.all([
        refreshAvailability(row.id).catch(() => {}),
        refreshRecommendations(row.id).catch(() => {}),
        extractAndStoreColors(row.id, movie.poster_path).catch(() => {}),
      ]);
    } else {
      refreshAvailability(row.id).catch(() => {});
      refreshRecommendations(row.id).catch(() => {});
      extractAndStoreColors(row.id, movie.poster_path).catch(() => {});
    }
    if (imageCacheEnabled()) cacheImagesForTitle(row.id).catch(() => {});
    return row;
  }

  const show = await getTvDetails(tmdbId);
  const row = db
    .insert(titles)
    .values({
      tmdbId: show.id,
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
      lastFetchedAt: now,
    })
    .returning()
    .get();

  await refreshTvChildren(row.id, tmdbId, show.number_of_seasons);
  if (awaitEnrichment) {
    await Promise.all([
      refreshAvailability(row.id).catch(() => {}),
      refreshRecommendations(row.id).catch(() => {}),
      extractAndStoreColors(row.id, show.poster_path).catch(() => {}),
    ]);
  } else {
    refreshAvailability(row.id).catch(() => {});
    refreshRecommendations(row.id).catch(() => {});
    extractAndStoreColors(row.id, show.poster_path).catch(() => {});
  }
  if (imageCacheEnabled()) {
    cacheImagesForTitle(row.id).catch(() => {});
    cacheEpisodeStills(row.id).catch(() => {});
  }
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
        lastFetchedAt: now,
      })
      .where(eq(titles.id, titleId))
      .run();
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
        lastFetchedAt: now,
      })
      .where(eq(titles.id, titleId))
      .run();
    await refreshTvChildren(titleId, title.tmdbId, show.number_of_seasons);
  }

  const updated = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (updated) {
    extractAndStoreColors(updated.id, updated.posterPath).catch(() => {});
    if (imageCacheEnabled()) {
      cacheImagesForTitle(updated.id).catch(() => {});
      if (updated.type === "tv") cacheEpisodeStills(updated.id).catch(() => {});
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

      for (const ep of seasonData.episodes) {
        db.insert(episodes)
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

  // Process recommendations
  for (let i = 0; i < recs.results.length && i < 20; i++) {
    const r = recs.results[i];
    const type = r.media_type ?? title.type;
    if (type !== "movie" && type !== "tv") continue;

    // Minimal upsert of the recommended title
    const existing = db
      .select()
      .from(titles)
      .where(eq(titles.tmdbId, r.id))
      .get();
    let recTitleId: string;
    if (existing) {
      recTitleId = existing.id;
    } else {
      const row = db
        .insert(titles)
        .values({
          tmdbId: r.id,
          type,
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
      if (!row) {
        const found = db
          .select()
          .from(titles)
          .where(eq(titles.tmdbId, r.id))
          .get();
        if (!found) continue;
        recTitleId = found.id;
      } else {
        recTitleId = row.id;
      }
    }

    db.insert(titleRecommendations)
      .values({
        titleId,
        recommendedTitleId: recTitleId,
        source: "tmdb_recommendations",
        rank: i + 1,
        lastFetchedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          titleRecommendations.titleId,
          titleRecommendations.recommendedTitleId,
          titleRecommendations.source,
        ],
        set: { rank: i + 1, lastFetchedAt: now },
      })
      .run();
  }

  // Process similar
  for (let i = 0; i < similar.results.length && i < 20; i++) {
    const r = similar.results[i];
    const type = r.media_type ?? title.type;
    if (type !== "movie" && type !== "tv") continue;

    const existing = db
      .select()
      .from(titles)
      .where(eq(titles.tmdbId, r.id))
      .get();
    let recTitleId: string;
    if (existing) {
      recTitleId = existing.id;
    } else {
      const row = db
        .insert(titles)
        .values({
          tmdbId: r.id,
          type,
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
      if (!row) {
        const found = db
          .select()
          .from(titles)
          .where(eq(titles.tmdbId, r.id))
          .get();
        if (!found) continue;
        recTitleId = found.id;
      } else {
        recTitleId = row.id;
      }
    }

    db.insert(titleRecommendations)
      .values({
        titleId,
        recommendedTitleId: recTitleId,
        source: "tmdb_similar",
        rank: i + 1,
        lastFetchedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          titleRecommendations.titleId,
          titleRecommendations.recommendedTitleId,
          titleRecommendations.source,
        ],
        set: { rank: i + 1, lastFetchedAt: now },
      })
      .run();
  }
}

export async function getTitleWithChildren(id: string): Promise<{
  title: ResolvedTitle;
  seasons: Season[];
  availability: AvailabilityOffer[];
} | null> {
  let title = db.select().from(titles).where(eq(titles.id, id)).get();
  if (!title) return null;

  // If this is a shell TV title, fetch full details now
  if (title.type === "tv" && !title.lastFetchedAt) {
    try {
      const show = await getTvDetails(title.tmdbId);
      db.update(titles)
        .set({
          overview: show.overview,
          posterPath: show.poster_path,
          backdropPath: show.backdrop_path,
          status: show.status,
          lastFetchedAt: new Date(),
        })
        .where(eq(titles.id, id))
        .run();
      await refreshTvChildren(id, title.tmdbId, show.number_of_seasons);
      title = db.select().from(titles).where(eq(titles.id, id)).get() ?? title;
    } catch (err) {
      log.debug(`Failed to hydrate shell TV title ${id}:`, err);
    }
  }

  // If this is a shell movie title, fetch full details now
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
          lastFetchedAt: new Date(),
        })
        .where(eq(titles.id, id))
        .run();
      title = db.select().from(titles).where(eq(titles.id, id)).get() ?? title;
    } catch (err) {
      log.debug(`Failed to hydrate shell movie title ${id}:`, err);
    }
  }

  let titleSeasons: Season[] = [];

  if (title.type === "tv") {
    const seasonRows = db
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, title.id))
      .orderBy(seasons.seasonNumber)
      .all();

    // Batch fetch all episodes for all seasons (1 query)
    const seasonIds = seasonRows.map((s) => s.id);
    const allEps =
      seasonIds.length > 0
        ? db
            .select()
            .from(episodes)
            .where(inArray(episodes.seasonId, seasonIds))
            .orderBy(episodes.seasonId, episodes.episodeNumber)
            .all()
        : [];

    // Group episodes by season
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

    titleSeasons = seasonRows.map((s) => ({
      id: s.id,
      seasonNumber: s.seasonNumber,
      name: s.name,
      episodes: epsBySeason.get(s.id) ?? [],
    }));
  }

  const availability = db
    .select()
    .from(availabilityOffers)
    .where(eq(availabilityOffers.titleId, title.id))
    .all()
    .map(
      (a): AvailabilityOffer => ({
        providerId: a.providerId,
        providerName: a.providerName,
        logoPath: tmdbImageUrl(a.logoPath, "w92"),
        offerType: a.offerType,
      }),
    );

  // Lazy color extraction — await so the palette is available for theming
  let palette = parseColorPalette(title.colorPalette);
  if (!palette && title.posterPath) {
    palette =
      (await extractAndStoreColors(title.id, title.posterPath).catch(
        () => null,
      )) ?? null;
  }

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
    colorPalette: palette,
  };

  return { title: resolvedTitle, seasons: titleSeasons, availability };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
