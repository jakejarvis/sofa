import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  importJobs,
  titles,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "@sofa/db/schema";
import {
  clearAllTables,
  eq,
  insertMovieWatch,
  insertTvShow,
  insertUser,
  testDb,
} from "@sofa/test/db";
import * as tmdbClient from "@sofa/tmdb/client";

import type { NormalizedImport } from "../src/imports/parsers";
import { processImportJob, readImportJob } from "../src/imports/processor";

// ── Helpers ─────────────────────────────────────────────────────────

/** Insert a fully-fetched movie title (lastFetchedAt set so metadata won't re-fetch). */
function insertMovieTitle(id: string, tmdbId: number, movieTitle = "Test Movie") {
  testDb
    .insert(titles)
    .values({
      id,
      tmdbId,
      type: "movie",
      title: movieTitle,
      lastFetchedAt: new Date(),
    })
    .run();
  return id;
}

/** Insert a fully-fetched TV title with seasons/episodes (lastFetchedAt set). */
function insertTvShowWithFetchedAt(
  titleId: string,
  tmdbId: number,
  seasonCount = 1,
  epsPerSeason = 3,
) {
  const result = insertTvShow(titleId, tmdbId, seasonCount, epsPerSeason);
  // Mark as fully fetched so getOrFetchTitleByTmdbId skips TMDB API calls
  testDb.update(titles).set({ lastFetchedAt: new Date() }).where(eq(titles.id, titleId)).run();
  return result;
}

/** Create an import job row in the DB and return its ID. */
function createJob(
  userId: string,
  payload: NormalizedImport,
  options: {
    importWatches?: boolean;
    importWatchlist?: boolean;
    importRatings?: boolean;
  } = {},
): string {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  testDb
    .insert(importJobs)
    .values({
      id,
      userId,
      source: payload.source,
      status: "pending",
      payload: JSON.stringify(payload),
      importWatches: options.importWatches ?? true,
      importWatchlist: options.importWatchlist ?? true,
      importRatings: options.importRatings ?? true,
      createdAt: new Date(),
    })
    .run();
  return id;
}

beforeEach(() => {
  clearAllTables();
});

// ── Movie Import ────────────────────────────────────────────────────

describe("processImportJob — movies", () => {
  test("imports a movie with direct tmdbId", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");

    const payload: NormalizedImport = {
      source: "trakt",
      movies: [
        {
          tmdbId: 550,
          title: "Fight Club",
          year: 1999,
          watchedAt: "2024-06-15T20:00:00Z",
        },
      ],
      episodes: [],
      watchlist: [],
      ratings: [],
    };

    const jobId = createJob(userId, payload);
    await processImportJob(jobId);

    const job = readImportJob(jobId);
    expect(job.status).toBe("success");
    expect(job.importedCount).toBe(1);
    expect(job.skippedCount).toBe(0);
    expect(job.failedCount).toBe(0);

    // Verify watch record created
    const watches = testDb
      .select()
      .from(userMovieWatches)
      .where(eq(userMovieWatches.userId, userId))
      .all();
    expect(watches).toHaveLength(1);
    expect(watches[0].titleId).toBe("movie-1");
  });

  test("deduplicates existing movie watches", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");
    insertMovieWatch(userId, "movie-1");

    const payload: NormalizedImport = {
      source: "trakt",
      movies: [{ tmdbId: 550, title: "Fight Club" }],
      episodes: [],
      watchlist: [],
      ratings: [],
    };

    const jobId = createJob(userId, payload);
    await processImportJob(jobId);

    const job = readImportJob(jobId);
    expect(job.status).toBe("success");
    expect(job.importedCount).toBe(0);
    expect(job.skippedCount).toBe(1);

    // Should still be just the original watch
    const watches = testDb
      .select()
      .from(userMovieWatches)
      .where(eq(userMovieWatches.userId, userId))
      .all();
    expect(watches).toHaveLength(1);
  });
});

// ── Episode Import ──────────────────────────────────────────────────

describe("processImportJob — episodes", () => {
  test("imports episodes for a pre-seeded TV show", async () => {
    const userId = insertUser();
    insertTvShowWithFetchedAt("tv-1", 1399, 1, 3);

    const payload: NormalizedImport = {
      source: "trakt",
      movies: [],
      episodes: [
        {
          showTmdbId: 1399,
          showTitle: "Test Show",
          seasonNumber: 1,
          episodeNumber: 1,
          watchedAt: "2024-01-10T20:00:00Z",
        },
        {
          showTmdbId: 1399,
          showTitle: "Test Show",
          seasonNumber: 1,
          episodeNumber: 2,
          watchedAt: "2024-01-11T20:00:00Z",
        },
      ],
      watchlist: [],
      ratings: [],
    };

    const jobId = createJob(userId, payload);
    await processImportJob(jobId);

    const job = readImportJob(jobId);
    expect(job.status).toBe("success");
    expect(job.importedCount).toBe(2);
    expect(job.failedCount).toBe(0);

    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, userId))
      .all();
    expect(watches).toHaveLength(2);
  });
});

// ── Watchlist Import ────────────────────────────────────────────────

describe("processImportJob — watchlist", () => {
  test("sets title status to watchlist", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-wl", 999, "Watchlist Movie");

    const payload: NormalizedImport = {
      source: "simkl",
      movies: [],
      episodes: [],
      watchlist: [{ tmdbId: 999, title: "Watchlist Movie", type: "movie" }],
      ratings: [],
    };

    const jobId = createJob(userId, payload, {
      importWatches: false,
      importWatchlist: true,
      importRatings: false,
    });
    await processImportJob(jobId);

    const job = readImportJob(jobId);
    expect(job.status).toBe("success");
    expect(job.importedCount).toBe(1);

    const statusRow = testDb
      .select()
      .from(userTitleStatus)
      .where(eq(userTitleStatus.userId, userId))
      .all();
    expect(statusRow).toHaveLength(1);
    expect(statusRow[0].status).toBe("watchlist");
    expect(statusRow[0].titleId).toBe("movie-wl");
  });
});

// ── Rating Import ───────────────────────────────────────────────────

describe("processImportJob — ratings", () => {
  test("stores rating correctly", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-r", 888, "Rated Movie");

    const payload: NormalizedImport = {
      source: "trakt",
      movies: [],
      episodes: [],
      watchlist: [],
      ratings: [
        {
          tmdbId: 888,
          title: "Rated Movie",
          type: "movie",
          rating: 4,
          ratedAt: "2024-03-01T12:00:00Z",
        },
      ],
    };

    const jobId = createJob(userId, payload, {
      importWatches: false,
      importWatchlist: false,
      importRatings: true,
    });
    await processImportJob(jobId);

    const job = readImportJob(jobId);
    expect(job.status).toBe("success");
    expect(job.importedCount).toBe(1);

    const ratingRows = testDb
      .select()
      .from(userRatings)
      .where(eq(userRatings.userId, userId))
      .all();
    expect(ratingRows).toHaveLength(1);
    expect(ratingRows[0].ratingStars).toBe(4);
    expect(ratingRows[0].titleId).toBe("movie-r");
  });
});

// ── Job State Transitions ───────────────────────────────────────────

describe("processImportJob — state transitions", () => {
  test("job starts as pending, ends as success", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-st", 111, "State Test");

    const payload: NormalizedImport = {
      source: "letterboxd",
      movies: [{ tmdbId: 111, title: "State Test" }],
      episodes: [],
      watchlist: [],
      ratings: [],
    };

    const jobId = createJob(userId, payload);

    // Before processing
    const before = readImportJob(jobId);
    expect(before.status).toBe("pending");
    expect(before.startedAt).toBeNull();
    expect(before.finishedAt).toBeNull();

    await processImportJob(jobId);

    // After processing
    const after = readImportJob(jobId);
    expect(after.status).toBe("success");
    expect(after.startedAt).not.toBeNull();
    expect(after.finishedAt).not.toBeNull();
  });

  test("empty import with no matching options succeeds with warning", async () => {
    const userId = insertUser();

    const payload: NormalizedImport = {
      source: "trakt",
      movies: [{ tmdbId: 111, title: "A Movie" }],
      episodes: [],
      watchlist: [],
      ratings: [],
    };

    // Disable all import options — movies exist but importWatches is false
    const jobId = createJob(userId, payload, {
      importWatches: false,
      importWatchlist: false,
      importRatings: false,
    });
    await processImportJob(jobId);

    const job = readImportJob(jobId);
    expect(job.status).toBe("success");
    expect(job.warnings.length).toBeGreaterThan(0);
    expect(job.warnings[0]).toContain("No items to import");
  });

  test("readImportJob throws for non-existent job", () => {
    expect(() => readImportJob("non-existent-id")).toThrow("Import job non-existent-id not found");
  });

  test("schema allows only one active import job per user", () => {
    const userId = insertUser();
    const createdAt = new Date();

    testDb
      .insert(importJobs)
      .values({
        id: "job-1",
        userId,
        source: "trakt",
        status: "pending",
        payload: JSON.stringify({
          source: "trakt",
          movies: [],
          episodes: [],
          watchlist: [],
          ratings: [],
        }),
        importWatches: true,
        importWatchlist: true,
        importRatings: true,
        createdAt,
      })
      .run();

    expect(() =>
      testDb
        .insert(importJobs)
        .values({
          id: "job-2",
          userId,
          source: "simkl",
          status: "running",
          payload: JSON.stringify({
            source: "simkl",
            movies: [],
            episodes: [],
            watchlist: [],
            ratings: [],
          }),
          importWatches: true,
          importWatchlist: true,
          importRatings: true,
          createdAt,
        })
        .run(),
    ).toThrow("UNIQUE constraint");

    testDb.update(importJobs).set({ status: "success" }).where(eq(importJobs.id, "job-1")).run();

    expect(() =>
      testDb
        .insert(importJobs)
        .values({
          id: "job-3",
          userId,
          source: "letterboxd",
          status: "pending",
          payload: JSON.stringify({
            source: "letterboxd",
            movies: [],
            episodes: [],
            watchlist: [],
            ratings: [],
          }),
          importWatches: true,
          importWatchlist: true,
          importRatings: true,
          createdAt,
        })
        .run(),
    ).not.toThrow();
  });
});

// ── Failed Resolution ───────────────────────────────────────────────

describe("processImportJob — failed resolution", () => {
  test("records failure when movie cannot be resolved", async () => {
    const userId = insertUser();

    const payload: NormalizedImport = {
      source: "letterboxd",
      movies: [{ title: "Completely Unknown Film ZZZZZ" }],
      episodes: [],
      watchlist: [],
      ratings: [],
    };

    // Mock TMDB search to return empty results (no network call)
    const searchSpy = vi.spyOn(tmdbClient, "searchMovies").mockResolvedValue({
      results: [],
    } as never);

    try {
      const jobId = createJob(userId, payload);
      await processImportJob(jobId);

      const job = readImportJob(jobId);
      expect(job.status).toBe("success");
      expect(job.failedCount).toBe(1);
      expect(job.importedCount).toBe(0);
      expect(job.errors.length).toBeGreaterThan(0);
      expect(job.errors[0]).toContain("Could not resolve movie");
    } finally {
      searchSpy.mockRestore();
    }
  });
});
