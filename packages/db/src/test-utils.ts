import { Database } from "bun:sqlite";

import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import * as schema from "./schema";

const {
  user,
  titles,
  seasons,
  episodes,
  userMovieWatches,
  userEpisodeWatches,
  userTitleStatus,
  userRatings,
  availabilityOffers,
  titleRecommendations,
  integrations,
} = schema;

export const testClient = new Database(":memory:");
testClient.run("PRAGMA foreign_keys = ON");
export const testDb = drizzle({ client: testClient, schema });

export function applyMigrations() {
  const migrationsFolder = `${import.meta.dir}/../drizzle`;
  migrate(testDb, { migrationsFolder });
}

export function clearAllTables() {
  const tables = testClient
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '__drizzle%'")
    .all() as { name: string }[];
  testClient.run("PRAGMA foreign_keys = OFF");
  for (const { name } of tables) {
    testClient.run(`DELETE FROM "${name}"`);
  }
  testClient.run("PRAGMA foreign_keys = ON");
}

const now = new Date();

export function insertUser(id = "user-1") {
  testDb
    .insert(user)
    .values({
      id,
      name: "Test User",
      email: `${id}@test.com`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

export function insertTitle(
  overrides: {
    id?: string;
    tmdbId?: number;
    tvdbId?: number;
    type?: "movie" | "tv";
    title?: string;
    releaseDate?: string;
    posterPath?: string;
    status?: string;
  } = {},
) {
  const id = overrides.id ?? "title-1";
  testDb
    .insert(titles)
    .values({
      id,
      tmdbId: overrides.tmdbId ?? 12345,
      tvdbId: overrides.tvdbId,
      type: overrides.type ?? "movie",
      title: overrides.title ?? "Test Movie",
      releaseDate: overrides.releaseDate,
      posterPath: overrides.posterPath,
      status: overrides.status,
    })
    .run();
  return id;
}

export function insertTvShow(
  titleId = "tv-1",
  tmdbId = 99999,
  seasonCount = 1,
  epsPerSeason = 3,
  options: { title?: string; airDates?: string[]; status?: string } = {},
) {
  insertTitle({
    id: titleId,
    tmdbId,
    type: "tv",
    title: options.title ?? "Test Show",
    status: options.status,
  });
  const episodeIds: string[] = [];
  let airDateIdx = 0;
  for (let s = 1; s <= seasonCount; s++) {
    const seasonId = `${titleId}-s${s}`;
    testDb.insert(seasons).values({ id: seasonId, titleId, seasonNumber: s }).run();
    for (let e = 1; e <= epsPerSeason; e++) {
      const epId = `${titleId}-s${s}e${e}`;
      testDb
        .insert(episodes)
        .values({
          id: epId,
          seasonId,
          episodeNumber: e,
          name: `S${s}E${e}`,
          airDate: options.airDates?.[airDateIdx],
        })
        .run();
      episodeIds.push(epId);
      airDateIdx++;
    }
  }
  return { titleId, episodeIds };
}

export function insertMovieWatch(userId: string, titleId: string, watchedAt?: Date) {
  testDb
    .insert(userMovieWatches)
    .values({
      userId,
      titleId,
      watchedAt: watchedAt ?? new Date(),
      source: "manual",
    })
    .run();
}

export function insertEpisodeWatch(userId: string, episodeId: string, watchedAt?: Date) {
  testDb
    .insert(userEpisodeWatches)
    .values({
      userId,
      episodeId,
      watchedAt: watchedAt ?? new Date(),
      source: "manual",
    })
    .run();
}

export function insertStatus(
  userId: string,
  titleId: string,
  status: "watchlist" | "in_progress" | "completed",
) {
  const timestamp = new Date();
  testDb
    .insert(userTitleStatus)
    .values({ userId, titleId, status, addedAt: timestamp, updatedAt: timestamp })
    .run();
}

export function insertRating(userId: string, titleId: string, ratingStars: number) {
  testDb.insert(userRatings).values({ userId, titleId, ratingStars, ratedAt: new Date() }).run();
}

export function insertAvailabilityOffer(
  titleId: string,
  overrides: {
    providerId?: number;
    providerName?: string;
    offerType?: "flatrate" | "rent" | "buy" | "free" | "ads";
  } = {},
) {
  testDb
    .insert(availabilityOffers)
    .values({
      titleId,
      providerId: overrides.providerId ?? 8,
      providerName: overrides.providerName ?? "Netflix",
      offerType: overrides.offerType ?? "flatrate",
    })
    .run();
}

export function insertIntegration(userId: string, provider: string, token = "test-token") {
  const type = provider === "sonarr" || provider === "radarr" ? "list" : "webhook";
  return testDb
    .insert(integrations)
    .values({
      userId,
      provider,
      type,
      token,
      enabled: true,
      createdAt: new Date(),
    })
    .returning()
    .get();
}

export function insertRecommendation(
  titleId: string,
  recommendedTitleId: string,
  overrides: {
    source?: "tmdb_recommendations" | "tmdb_similar";
    rank?: number;
  } = {},
) {
  testDb
    .insert(titleRecommendations)
    .values({
      titleId,
      recommendedTitleId,
      source: overrides.source ?? "tmdb_recommendations",
      rank: overrides.rank ?? 1,
    })
    .run();
}

export {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
