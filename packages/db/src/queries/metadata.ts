import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "../client";
import {
  episodes,
  genres,
  platforms,
  seasons,
  titleAvailability,
  titleGenres,
  titleRecommendations,
  titles,
} from "../schema";

// ─── Title CRUD ──────────────────────────────────────────────────────

/**
 * Insert a title row with returning, or return the existing row if a concurrent
 * insert wins the race (catches SQLITE_CONSTRAINT_UNIQUE).
 */
export function insertTitleReturning(values: typeof titles.$inferInsert) {
  try {
    return db.insert(titles).values(values).returning().get();
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return db
        .select()
        .from(titles)
        .where(and(eq(titles.tmdbId, values.tmdbId), eq(titles.type, values.type)))
        .get();
    }
    throw err;
  }
}

export function getTitleByTmdbId(tmdbId: number) {
  return db.select().from(titles).where(eq(titles.tmdbId, tmdbId)).get();
}

export function getTitleByTmdbIdAndType(tmdbId: number, type: "movie" | "tv") {
  return db
    .select()
    .from(titles)
    .where(and(eq(titles.tmdbId, tmdbId), eq(titles.type, type)))
    .get();
}

export function updateTitleFields(titleId: string, values: Partial<typeof titles.$inferInsert>) {
  db.update(titles).set(values).where(eq(titles.id, titleId)).run();
}

export function updateTrailerKey(titleId: string, key: string | null) {
  db.update(titles).set({ trailerVideoKey: key }).where(eq(titles.id, titleId)).run();
}

// ─── Genres ──────────────────────────────────────────────────────────

interface TmdbGenreInput {
  id: number;
  name?: string;
}

/**
 * Upsert genre rows and re-link them to a title in a single transaction.
 * Filters out genres without a name.
 */
export function upsertGenresTransaction(titleId: string, tmdbGenres: TmdbGenreInput[]) {
  const validGenres = tmdbGenres.filter((g): g is TmdbGenreInput & { name: string } => !!g.name);
  if (validGenres.length === 0) return;
  db.transaction((tx) => {
    for (const g of validGenres) {
      tx.insert(genres)
        .values({ id: g.id, name: g.name })
        .onConflictDoUpdate({ target: genres.id, set: { name: g.name } })
        .run();
    }
    tx.delete(titleGenres).where(eq(titleGenres.titleId, titleId)).run();
    for (const g of validGenres) {
      tx.insert(titleGenres).values({ titleId, genreId: g.id }).onConflictDoNothing().run();
    }
  });
}

export function getTitleGenres(titleId: string) {
  return db
    .select({ name: genres.name })
    .from(titleGenres)
    .innerJoin(genres, eq(titleGenres.genreId, genres.id))
    .where(eq(titleGenres.titleId, titleId))
    .all();
}

// ─── Seasons ─────────────────────────────────────────────────────────

export function hasSeasonForTitle(titleId: string) {
  return (
    db
      .select({ id: seasons.id })
      .from(seasons)
      .where(eq(seasons.titleId, titleId))
      .limit(1)
      .get() != null
  );
}

export function getExistingSeasonInfo(titleId: string, seasonNumber: number) {
  return db
    .select({
      id: seasons.id,
      posterPath: seasons.posterPath,
    })
    .from(seasons)
    .where(and(eq(seasons.titleId, titleId), eq(seasons.seasonNumber, seasonNumber)))
    .get();
}

export function upsertSeasonReturning(values: {
  titleId: string;
  seasonNumber: number;
  name: string | null;
  overview: string | null;
  posterPath: string | null;
  airDate: string | null;
  lastFetchedAt: Date;
}) {
  return db
    .insert(seasons)
    .values(values)
    .onConflictDoUpdate({
      target: [seasons.titleId, seasons.seasonNumber],
      set: {
        name: values.name,
        overview: values.overview,
        posterPath: values.posterPath,
        airDate: values.airDate,
        lastFetchedAt: values.lastFetchedAt,
      },
    })
    .returning()
    .get();
}

export function getSeasonsForTitle(titleId: string) {
  return db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .orderBy(seasons.seasonNumber)
    .all();
}

export function nullifySeasonThumbHash(seasonId: string) {
  db.update(seasons).set({ posterThumbHash: null }).where(eq(seasons.id, seasonId)).run();
}

// ─── Episodes ────────────────────────────────────────────────────────

export function getOldEpisodeStills(seasonId: string) {
  return new Map(
    db
      .select({
        episodeNumber: episodes.episodeNumber,
        stillPath: episodes.stillPath,
      })
      .from(episodes)
      .where(eq(episodes.seasonId, seasonId))
      .all()
      .map((e) => [e.episodeNumber, e.stillPath] as const),
  );
}

interface EpisodeUpsertInput {
  episode_number: number;
  name: string | null;
  overview: string | null;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
}

/**
 * Upsert all episodes for a season in a single transaction.
 */
export function batchUpsertEpisodes(seasonId: string, eps: EpisodeUpsertInput[]) {
  if (eps.length === 0) return;
  db.transaction((tx) => {
    for (const ep of eps) {
      tx.insert(episodes)
        .values({
          seasonId,
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

export function getSeasonEpisodesWithHashes(seasonId: string) {
  return db
    .select({
      id: episodes.id,
      episodeNumber: episodes.episodeNumber,
      stillPath: episodes.stillPath,
      stillThumbHash: episodes.stillThumbHash,
    })
    .from(episodes)
    .where(eq(episodes.seasonId, seasonId))
    .all();
}

export function nullifyEpisodeThumbHash(episodeId: string) {
  db.update(episodes).set({ stillThumbHash: null }).where(eq(episodes.id, episodeId)).run();
}

export function getEpisodesBySeasonIds(seasonIds: string[]) {
  if (seasonIds.length === 0) return [];
  return db
    .select()
    .from(episodes)
    .where(inArray(episodes.seasonId, seasonIds))
    .orderBy(episodes.seasonId, episodes.episodeNumber)
    .all();
}

/**
 * Select episodes that need a still thumb hash (have a stillPath but no hash).
 */
export function getEpisodesNeedingStillHash(seasonIds: string[]) {
  if (seasonIds.length === 0) return [];
  return db
    .select({
      id: episodes.id,
      stillPath: episodes.stillPath,
    })
    .from(episodes)
    .where(
      and(
        inArray(episodes.seasonId, seasonIds),
        isNotNull(episodes.stillPath),
        sql`${episodes.stillThumbHash} IS NULL`,
      ),
    )
    .all();
}

// ─── Availability ────────────────────────────────────────────────────

export function getAvailabilityOffersForTitle(titleId: string) {
  return db
    .select({
      platformId: platforms.id,
      providerName: platforms.name,
      logoPath: platforms.logoPath,
      urlTemplate: platforms.urlTemplate,
      tmdbProviderId: platforms.tmdbProviderId,
      offerType: titleAvailability.offerType,
    })
    .from(titleAvailability)
    .innerJoin(platforms, eq(titleAvailability.platformId, platforms.id))
    .where(eq(titleAvailability.titleId, titleId))
    .all();
}

// ─── Recommendations ─────────────────────────────────────────────────

export function hasRecommendationsForTitle(titleId: string) {
  return (
    db
      .select({ titleId: titleRecommendations.titleId })
      .from(titleRecommendations)
      .where(eq(titleRecommendations.titleId, titleId))
      .limit(1)
      .get() != null
  );
}

interface RecommendationTitleInput {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  popularity: number | null;
  voteAverage: number | null;
  voteCount: number | null;
}

interface RecommendationRowInput {
  tmdbId: number;
  source: "tmdb_recommendations" | "tmdb_similar";
  rank: number;
}

/**
 * Large transaction: upsert shell titles for recommendations, then upsert
 * the recommendation link rows. Returns the titleIdMap (tmdbId -> titleId)
 * so the caller can fire off thumbhash generation.
 */
export function upsertRecommendationsTransaction(
  titleId: string,
  uniqueTitles: Map<number, RecommendationTitleInput>,
  allItems: RecommendationRowInput[],
  now: Date,
): Map<number, string> {
  const tmdbIds = [...uniqueTitles.keys()];

  // Batch prefetch existing titles (1 query)
  const existingTitles = db
    .select({
      id: titles.id,
      tmdbId: titles.tmdbId,
      type: titles.type,
      posterPath: titles.posterPath,
      backdropPath: titles.backdropPath,
      posterThumbHash: titles.posterThumbHash,
      backdropThumbHash: titles.backdropThumbHash,
    })
    .from(titles)
    .where(inArray(titles.tmdbId, tmdbIds))
    .all();

  // Key by (tmdbId, type) composite since the unique constraint is on both columns.
  // The same tmdbId can exist as both a movie and TV show.
  const existingTitleMap = new Map(existingTitles.map((t) => [`${t.tmdbId}-${t.type}`, t]));
  const titleIdMap = new Map<number, string>();
  for (const [tmdbId, item] of uniqueTitles) {
    const existing = existingTitleMap.get(`${tmdbId}-${item.type}`);
    if (existing) {
      titleIdMap.set(tmdbId, existing.id);
    }
  }

  db.transaction((tx) => {
    const insertedTmdbIds = new Set<number>();
    for (const item of uniqueTitles.values()) {
      const existingTitle = existingTitleMap.get(`${item.tmdbId}-${item.type}`);
      if (existingTitle) {
        const posterPathChanged = existingTitle.posterPath !== item.posterPath;
        const backdropPathChanged = existingTitle.backdropPath !== item.backdropPath;

        tx.update(titles)
          .set({
            type: item.type,
            title: item.title,
            originalTitle: item.originalTitle,
            overview: item.overview,
            releaseDate: item.releaseDate,
            firstAirDate: item.firstAirDate,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            popularity: item.popularity,
            voteAverage: item.voteAverage,
            voteCount: item.voteCount,
            ...(posterPathChanged
              ? {
                  posterThumbHash: null,
                  colorPalette: null,
                }
              : {}),
            ...(backdropPathChanged
              ? {
                  backdropThumbHash: null,
                }
              : {}),
          })
          .where(eq(titles.id, existingTitle.id))
          .run();
        continue;
      }

      insertedTmdbIds.add(item.tmdbId);
      const row = tx
        .insert(titles)
        .values({
          tmdbId: item.tmdbId,
          type: item.type,
          title: item.title,
          originalTitle: item.originalTitle,
          overview: item.overview,
          releaseDate: item.releaseDate,
          firstAirDate: item.firstAirDate,
          posterPath: item.posterPath,
          backdropPath: item.backdropPath,
          popularity: item.popularity,
          voteAverage: item.voteAverage,
          voteCount: item.voteCount,
          lastFetchedAt: null,
        })
        .onConflictDoNothing()
        .returning()
        .get();
      if (row) titleIdMap.set(item.tmdbId, row.id);
    }

    // One fallback query for any that conflicted
    const stillMissing = [...insertedTmdbIds].filter((id) => !titleIdMap.has(id));
    if (stillMissing.length > 0) {
      const fallbacks = tx
        .select({ id: titles.id, tmdbId: titles.tmdbId, type: titles.type })
        .from(titles)
        .where(inArray(titles.tmdbId, stillMissing))
        .all();

      for (const f of fallbacks) {
        // Only map if the type matches what we were trying to insert
        const expected = uniqueTitles.get(f.tmdbId);
        if (expected && expected.type === f.type) {
          titleIdMap.set(f.tmdbId, f.id);
        }
      }
    }

    // Batch upsert all recommendation rows
    const recRows = allItems
      .map((item) => {
        const recTitleId = titleIdMap.get(item.tmdbId);
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

  return titleIdMap;
}

// ─── Poster hash helpers ─────────────────────────────────────────────

export function getTitlesNeedingPosterHash(titleIds: string[]) {
  if (titleIds.length === 0) return [];
  return db
    .select({ id: titles.id, posterPath: titles.posterPath })
    .from(titles)
    .where(
      and(
        inArray(titles.id, titleIds),
        isNotNull(titles.posterPath),
        sql`${titles.posterThumbHash} IS NULL`,
      ),
    )
    .all();
}

// ─── Browse batch upsert ─────────────────────────────────────────────

interface BrowseTitleInput {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  overview?: string | null;
  popularity?: number | null;
  voteAverage?: number | null;
  voteCount?: number | null;
}

/**
 * Ensure every browse/search result has a local title row.
 * Inserts shell titles (`lastFetchedAt = null`) for new (tmdbId, type) pairs.
 * Returns a map keyed by `${tmdbId}-${type}` -> `{ id, posterThumbHash }`.
 */
export function ensureBrowseTitlesTransaction(
  items: BrowseTitleInput[],
): Map<string, { id: string; posterThumbHash: string | null }> {
  if (items.length === 0) return new Map();

  // Deduplicate by (tmdbId, type)
  const unique = new Map<string, BrowseTitleInput>();
  for (const item of items) {
    const key = `${item.tmdbId}-${item.type}`;
    if (!unique.has(key)) unique.set(key, item);
  }

  const tmdbIds = [...new Set(items.map((i) => i.tmdbId))];

  // Batch-fetch existing titles (1 query)
  const existing = db
    .select({
      id: titles.id,
      tmdbId: titles.tmdbId,
      type: titles.type,
      posterThumbHash: titles.posterThumbHash,
    })
    .from(titles)
    .where(inArray(titles.tmdbId, tmdbIds))
    .all();

  const result = new Map<string, { id: string; posterThumbHash: string | null }>();
  for (const row of existing) {
    result.set(`${row.tmdbId}-${row.type}`, {
      id: row.id,
      posterThumbHash: row.posterThumbHash,
    });
  }

  // Find items that need inserting
  const missingKeys = [...unique.keys()].filter((key) => !result.has(key));
  if (missingKeys.length === 0) return result;

  // Insert missing in a single transaction
  db.transaction((tx) => {
    for (const key of missingKeys) {
      const item = unique.get(key);
      if (!item) continue;
      const row = tx
        .insert(titles)
        .values({
          tmdbId: item.tmdbId,
          type: item.type,
          title: item.title,
          overview: item.overview ?? null,
          releaseDate: item.releaseDate ?? null,
          firstAirDate: item.firstAirDate ?? null,
          posterPath: item.posterPath,
          backdropPath: item.backdropPath ?? null,
          popularity: item.popularity ?? null,
          voteAverage: item.voteAverage ?? null,
          voteCount: item.voteCount ?? null,
          lastFetchedAt: null,
        })
        .onConflictDoNothing()
        .returning({ id: titles.id, posterThumbHash: titles.posterThumbHash })
        .get();
      if (row) {
        result.set(key, {
          id: row.id,
          posterThumbHash: row.posterThumbHash,
        });
      }
    }

    // Fallback for any that conflicted (concurrent insert)
    const stillMissing = missingKeys.filter((key) => !result.has(key));
    if (stillMissing.length > 0) {
      const missingTmdbIds = stillMissing.map((key) => unique.get(key)?.tmdbId ?? 0);
      const fallbacks = tx
        .select({
          id: titles.id,
          tmdbId: titles.tmdbId,
          type: titles.type,
          posterThumbHash: titles.posterThumbHash,
        })
        .from(titles)
        .where(inArray(titles.tmdbId, missingTmdbIds))
        .all();
      for (const f of fallbacks) {
        result.set(`${f.tmdbId}-${f.type}`, {
          id: f.id,
          posterThumbHash: f.posterThumbHash,
        });
      }
    }
  });

  return result;
}
