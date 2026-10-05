import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { clearFinishedImportPayloads } from "@sofa/db/queries/imports";
import * as maintenance from "@sofa/db/queries/maintenance";
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
  insertStatus,
  insertTitle,
  insertTvShow,
  insertUser,
  testClient,
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

// ── Planner Statistics ──────────────────────────────────────────────

describe("processImportJob — planner statistics", () => {
  function createMovieJob() {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");
    const payload: NormalizedImport = {
      source: "trakt",
      movies: [{ tmdbId: 550, title: "Fight Club", watchedAt: "2024-06-15T20:00:00Z" }],
      episodes: [],
      watchlist: [],
      ratings: [],
    };
    return createJob(userId, payload);
  }

  test("refreshes planner statistics once after a successful import", async () => {
    const spy = vi.spyOn(maintenance, "refreshPlannerStats");
    const jobId = createMovieJob();

    await processImportJob(jobId);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(readImportJob(jobId).status).toBe("success");
  });

  test("a failing statistics refresh does not fail the import", async () => {
    vi.spyOn(maintenance, "refreshPlannerStats").mockImplementation(() => {
      throw new Error("boom");
    });
    const jobId = createMovieJob();

    await processImportJob(jobId);

    expect(readImportJob(jobId).status).toBe("success");
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

  function episodePayload(...eps: Array<[number, number]>): NormalizedImport {
    return {
      source: "trakt",
      movies: [],
      episodes: eps.map(([seasonNumber, episodeNumber]) => ({
        showTmdbId: 1399,
        showTitle: "Test Show",
        seasonNumber,
        episodeNumber,
        watchedAt: "2024-01-10T20:00:00Z",
      })),
      watchlist: [],
      ratings: [],
    };
  }

  function seasonDetails(seasonNumber: number, episodeCount: number) {
    return {
      season_number: seasonNumber,
      name: `Season ${seasonNumber}`,
      overview: "",
      poster_path: null,
      air_date: null,
      episodes: Array.from({ length: episodeCount }, (_, i) => ({
        episode_number: i + 1,
        name: `S${seasonNumber}E${i + 1}`,
        overview: "",
        still_path: null,
        air_date: null,
        runtime: 30,
      })),
    };
  }

  test("skips specials without an error and without refreshing the show", async () => {
    const userId = insertUser();
    insertTvShowWithFetchedAt("tv-1", 1399, 1, 3);
    const detailsSpy = vi.spyOn(tmdbClient, "getTvDetails");

    try {
      const jobId = createJob(userId, episodePayload([0, 1]));
      await processImportJob(jobId);

      const job = readImportJob(jobId);
      expect(job.status).toBe("success");
      expect(job.importedCount).toBe(0);
      expect(job.skippedCount).toBe(1);
      expect(job.failedCount).toBe(0);
      expect(job.errors).toHaveLength(0);
      expect(job.warnings).toHaveLength(1);
      expect(job.warnings[0]).toContain("season 0");
      expect(detailsSpy).not.toHaveBeenCalled();
    } finally {
      detailsSpy.mockRestore();
    }
  });

  test("refreshes a show once when episodes are newer than the last fetch", async () => {
    const userId = insertUser();
    insertTvShowWithFetchedAt("tv-1", 1399, 1, 3);
    const detailsSpy = vi
      .spyOn(tmdbClient, "getTvDetails")
      .mockResolvedValue({ number_of_seasons: 2 } as Awaited<
        ReturnType<typeof tmdbClient.getTvDetails>
      >);
    const seasonSpy = vi
      .spyOn(tmdbClient, "getTvSeasonDetails")
      .mockImplementation(
        async (_tmdbId, seasonNumber) =>
          seasonDetails(seasonNumber, seasonNumber === 1 ? 3 : 2) as never,
      );

    try {
      const jobId = createJob(userId, episodePayload([2, 1], [2, 2]));
      await processImportJob(jobId);

      const job = readImportJob(jobId);
      expect(job.status).toBe("success");
      expect(job.importedCount).toBe(2);
      expect(job.failedCount).toBe(0);
      expect(detailsSpy).toHaveBeenCalledTimes(1);
    } finally {
      detailsSpy.mockRestore();
      seasonSpy.mockRestore();
    }
  });

  test("still fails when the season is missing after the refresh", async () => {
    const userId = insertUser();
    insertTvShowWithFetchedAt("tv-1", 1399, 1, 3);
    const detailsSpy = vi
      .spyOn(tmdbClient, "getTvDetails")
      .mockResolvedValue({ number_of_seasons: 2 } as Awaited<
        ReturnType<typeof tmdbClient.getTvDetails>
      >);
    const seasonSpy = vi
      .spyOn(tmdbClient, "getTvSeasonDetails")
      .mockImplementation(async (_tmdbId, seasonNumber) => seasonDetails(seasonNumber, 3) as never);

    try {
      const jobId = createJob(userId, episodePayload([5, 1]));
      await processImportJob(jobId);

      const job = readImportJob(jobId);
      expect(job.importedCount).toBe(0);
      expect(job.failedCount).toBe(1);
      expect(job.errors[0]).toContain("Season 5 not found");
      expect(detailsSpy).toHaveBeenCalledTimes(1);
    } finally {
      detailsSpy.mockRestore();
      seasonSpy.mockRestore();
    }
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

// ── Status Normalization ────────────────────────────────────────────

describe("processImportJob — status normalization", () => {
  const watchlistOnly = {
    importWatches: false,
    importWatchlist: true,
    importRatings: false,
  };

  test("stores TV 'completed' as 'in_progress'", async () => {
    const userId = insertUser();
    insertTvShowWithFetchedAt("tv-c", 500);

    const payload: NormalizedImport = {
      source: "simkl",
      movies: [],
      episodes: [],
      watchlist: [{ tmdbId: 500, title: "Test Show", type: "tv", status: "completed" }],
      ratings: [],
    };

    const jobId = createJob(userId, payload, watchlistOnly);
    await processImportJob(jobId);

    const rows = testDb
      .select()
      .from(userTitleStatus)
      .where(eq(userTitleStatus.userId, userId))
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0].titleId).toBe("tv-c");
    expect(rows[0].status).toBe("in_progress");
  });

  test("stores movie 'in_progress' as 'watchlist'", async () => {
    const userId = insertUser();
    insertMovieTitle("m-ip", 501);

    const payload: NormalizedImport = {
      source: "simkl",
      movies: [],
      episodes: [],
      watchlist: [{ tmdbId: 501, title: "Test Movie", type: "movie", status: "in_progress" }],
      ratings: [],
    };

    const jobId = createJob(userId, payload, watchlistOnly);
    await processImportJob(jobId);

    const rows = testDb
      .select()
      .from(userTitleStatus)
      .where(eq(userTitleStatus.userId, userId))
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0].titleId).toBe("m-ip");
    expect(rows[0].status).toBe("watchlist");
  });
});

// ── Migration: normalize_imported_statuses ──────────────────────────

describe("normalize_imported_statuses migration", () => {
  test("repairs TV 'completed' and movie 'in_progress' rows", () => {
    const dir = fileURLToPath(new URL("../../db/drizzle", import.meta.url));
    const folder = readdirSync(dir).find((d) => d.endsWith("_normalize_imported_statuses"));
    expect(folder).toBeDefined();

    const userId = insertUser();
    insertTitle({ id: "mig-tv", tmdbId: 7001, type: "tv", title: "Mig Show" });
    insertTitle({ id: "mig-watched", tmdbId: 7002, type: "movie", title: "Mig Watched" });
    insertTitle({ id: "mig-unwatched", tmdbId: 7003, type: "movie", title: "Mig Unwatched" });
    insertStatus(userId, "mig-tv", "completed");
    insertStatus(userId, "mig-watched", "in_progress");
    insertStatus(userId, "mig-unwatched", "in_progress");
    insertMovieWatch(userId, "mig-watched");

    testClient.exec(readFileSync(join(dir, folder!, "migration.sql"), "utf8"));

    const statusOf = (titleId: string) =>
      testDb.select().from(userTitleStatus).where(eq(userTitleStatus.titleId, titleId)).get()
        ?.status;
    expect(statusOf("mig-tv")).toBe("in_progress");
    expect(statusOf("mig-watched")).toBe("completed");
    expect(statusOf("mig-unwatched")).toBe("watchlist");
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

    let duplicateActiveJobRejected = false;
    try {
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
        .run();
    } catch {
      duplicateActiveJobRejected = true;
    }
    expect(duplicateActiveJobRejected).toBe(true);

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

// ── Rewatches, added dates, late cancellation ───────────────────────

describe("processImportJob — rewatches and added dates", () => {
  const movieWatches = (userId: string) =>
    testDb.select().from(userMovieWatches).where(eq(userMovieWatches.userId, userId)).all();

  const emptyPayload = (source: NormalizedImport["source"]): NormalizedImport => ({
    source,
    movies: [],
    episodes: [],
    watchlist: [],
    ratings: [],
  });

  const twoPlays: NormalizedImport = {
    ...emptyPayload("trakt"),
    movies: [
      { tmdbId: 550, title: "Fight Club", watchedAt: "2024-01-01T20:00:00Z" },
      { tmdbId: 550, title: "Fight Club", watchedAt: "2024-06-01T20:00:00Z" },
    ],
  };

  test("keeps rewatches with distinct timestamps", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");

    const jobId = createJob(userId, twoPlays);
    await processImportJob(jobId);

    const job = readImportJob(jobId);
    expect(job.importedCount).toBe(2);
    expect(movieWatches(userId)).toHaveLength(2);
  });

  test("skips a play already recorded at the same time", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");
    insertMovieWatch(userId, "movie-1", new Date("2024-01-01T20:30:00Z"));

    const payload: NormalizedImport = {
      ...emptyPayload("trakt"),
      movies: [{ tmdbId: 550, title: "Fight Club", watchedAt: "2024-01-01T20:00:00Z" }],
    };
    const jobId = createJob(userId, payload);
    await processImportJob(jobId);

    const job = readImportJob(jobId);
    expect(job.skippedCount).toBe(1);
    expect(job.importedCount).toBe(0);
    expect(movieWatches(userId)).toHaveLength(1);
  });

  test("re-running the same import is idempotent", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");

    const firstJobId = createJob(userId, twoPlays);
    await processImportJob(firstJobId);
    expect(readImportJob(firstJobId).importedCount).toBe(2);

    const secondJobId = createJob(userId, twoPlays);
    await processImportJob(secondJobId);

    const second = readImportJob(secondJobId);
    expect(second.skippedCount).toBe(2);
    expect(second.importedCount).toBe(0);
    expect(movieWatches(userId)).toHaveLength(2);
  });

  test("keeps episode rewatches", async () => {
    const userId = insertUser();
    insertTvShowWithFetchedAt("tv-1", 1396);

    const payload: NormalizedImport = {
      ...emptyPayload("trakt"),
      episodes: [
        {
          showTmdbId: 1396,
          showTitle: "Test Show",
          seasonNumber: 1,
          episodeNumber: 1,
          watchedAt: "2024-01-01T20:00:00Z",
        },
        {
          showTmdbId: 1396,
          showTitle: "Test Show",
          seasonNumber: 1,
          episodeNumber: 1,
          watchedAt: "2024-02-01T20:00:00Z",
        },
      ],
    };
    const jobId = createJob(userId, payload);
    await processImportJob(jobId);

    expect(readImportJob(jobId).importedCount).toBe(2);
    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, userId))
      .all();
    expect(watches).toHaveLength(2);
  });

  test("date-only diary entries on different dates are both kept", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");

    const payload: NormalizedImport = {
      ...emptyPayload("letterboxd"),
      movies: [
        { tmdbId: 550, title: "Fight Club", watchedOn: "2024-01-01" },
        { tmdbId: 550, title: "Fight Club", watchedOn: "2024-01-10" },
      ],
    };
    const jobId = createJob(userId, payload);
    await processImportJob(jobId);

    expect(readImportJob(jobId).importedCount).toBe(2);
    expect(movieWatches(userId)).toHaveLength(2);
  });

  describe("date-only watches in a west-of-UTC server time zone", () => {
    async function withLosAngeles(fn: () => Promise<void>) {
      const tz = process.env.TZ;
      process.env.TZ = "America/Los_Angeles";
      try {
        await fn();
      } finally {
        if (tz === undefined) delete process.env.TZ;
        else process.env.TZ = tz;
      }
    }

    const diary = (...days: string[]): NormalizedImport => ({
      ...emptyPayload("letterboxd"),
      movies: days.map((watchedOn) => ({ tmdbId: 550, title: "Fight Club", watchedOn })),
    });

    test("consecutive-day diary entries are both kept", () =>
      withLosAngeles(async () => {
        const userId = insertUser();
        insertMovieTitle("movie-1", 550, "Fight Club");
        const jobId = createJob(userId, diary("2024-01-15", "2024-01-16"));
        await processImportJob(jobId);

        expect(readImportJob(jobId).importedCount).toBe(2);
        expect(movieWatches(userId)).toHaveLength(2);
      }));

    test("stores the watch on its calendar day", () =>
      withLosAngeles(async () => {
        const userId = insertUser();
        insertMovieTitle("movie-1", 550, "Fight Club");
        await processImportJob(createJob(userId, diary("2024-01-15")));

        const [watch] = movieWatches(userId);
        const at = watch?.watchedAt as Date;
        expect(at.getFullYear()).toBe(2024);
        expect(at.getMonth()).toBe(0);
        expect(at.getDate()).toBe(15);
      }));

    test("re-importing the same diary is idempotent", () =>
      withLosAngeles(async () => {
        const userId = insertUser();
        insertMovieTitle("movie-1", 550, "Fight Club");
        await processImportJob(createJob(userId, diary("2024-01-15")));
        const secondId = createJob(userId, diary("2024-01-15"));
        await processImportJob(secondId);

        expect(movieWatches(userId)).toHaveLength(1);
        expect(readImportJob(secondId).skippedCount).toBe(1);
      }));

    test("legacy UTC-midnight rows still dedupe", () =>
      withLosAngeles(async () => {
        const userId = insertUser();
        insertMovieTitle("movie-1", 550, "Fight Club");
        insertMovieWatch(userId, "movie-1", new Date("2024-01-15T00:00:00Z"));
        const jobId = createJob(userId, diary("2024-01-15"));
        await processImportJob(jobId);

        expect(readImportJob(jobId).skippedCount).toBe(1);
        expect(movieWatches(userId)).toHaveLength(1);
      }));

    test("a same-day evening play dedupes the diary entry", () =>
      withLosAngeles(async () => {
        const userId = insertUser();
        insertMovieTitle("movie-1", 550, "Fight Club");
        insertMovieWatch(userId, "movie-1", new Date("2024-01-15T21:30:00"));
        const jobId = createJob(userId, diary("2024-01-15"));
        await processImportJob(jobId);

        expect(readImportJob(jobId).skippedCount).toBe(1);
        expect(movieWatches(userId)).toHaveLength(1);
      }));
  });

  test("library item backdates addedAt after a watch created the row", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");

    const payload: NormalizedImport = {
      ...emptyPayload("trakt"),
      movies: [{ tmdbId: 550, title: "Fight Club", watchedAt: "2024-06-01T20:00:00Z" }],
      watchlist: [
        {
          tmdbId: 550,
          title: "Fight Club",
          type: "movie",
          status: "completed",
          addedAt: "2023-01-01T00:00:00Z",
        },
      ],
    };
    const jobId = createJob(userId, payload);
    await processImportJob(jobId);

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(eq(userTitleStatus.userId, userId))
      .get();
    expect(row).toBeDefined();
    expect(row?.addedAt).toEqual(new Date("2023-01-01T00:00:00Z"));
  });

  test("cancel during the last item is not overwritten by success", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");

    const payload: NormalizedImport = {
      ...emptyPayload("letterboxd"),
      movies: [{ imdbId: "tt0137523", title: "Fight Club" }],
    };

    let jobId = "";
    const findSpy = vi.spyOn(tmdbClient, "findByExternalId").mockImplementation(async () => {
      testDb.update(importJobs).set({ status: "cancelled" }).where(eq(importJobs.id, jobId)).run();
      return { movie_results: [{ id: 550 }] } as never;
    });

    try {
      jobId = createJob(userId, payload);
      await processImportJob(jobId);

      expect(findSpy).toHaveBeenCalled();
      const job = testDb.select().from(importJobs).where(eq(importJobs.id, jobId)).get();
      expect(job?.status).toBe("cancelled");
      expect(job?.finishedAt).not.toBeNull();
    } finally {
      findSpy.mockRestore();
    }
  });
});

// ── Payload retention ───────────────────────────────────────────────

const blankPayload = (source: NormalizedImport["source"]): NormalizedImport => ({
  source,
  movies: [],
  episodes: [],
  watchlist: [],
  ratings: [],
});

function readPayload(jobId: string) {
  return testDb
    .select({ payload: importJobs.payload })
    .from(importJobs)
    .where(eq(importJobs.id, jobId))
    .get()?.payload;
}

describe("processImportJob — payload retention", () => {
  test("empties the payload after a successful import", async () => {
    const userId = insertUser();
    insertMovieTitle("movie-1", 550, "Fight Club");

    const payload: NormalizedImport = {
      ...blankPayload("trakt"),
      movies: [{ tmdbId: 550, title: "Fight Club", year: 1999, watchedAt: "2024-06-15T20:00:00Z" }],
    };

    const jobId = createJob(userId, payload);
    expect(readPayload(jobId)).not.toBe("");

    await processImportJob(jobId);

    expect(readImportJob(jobId).status).toBe("success");
    expect(readPayload(jobId)).toBe("");
  });

  test("empties the payload of a job that fails on invalid JSON", async () => {
    const userId = insertUser();
    const jobId = "job-invalid-json";
    testDb
      .insert(importJobs)
      .values({
        id: jobId,
        userId,
        source: "trakt",
        status: "pending",
        payload: "{not json",
        importWatches: true,
        importWatchlist: true,
        importRatings: true,
        createdAt: new Date(),
      })
      .run();

    await processImportJob(jobId);

    const job = testDb.select().from(importJobs).where(eq(importJobs.id, jobId)).get();
    expect(job?.status).toBe("error");
    expect(job?.payload).toBe("");
  });

  test("clearFinishedImportPayloads only empties finished jobs", () => {
    // Only one active (pending/running) job is allowed per user
    const pendingId = createJob(insertUser("user-pending"), blankPayload("trakt"));
    const successId = createJob(insertUser("user-success"), blankPayload("trakt"));
    testDb.update(importJobs).set({ status: "success" }).where(eq(importJobs.id, successId)).run();

    expect(clearFinishedImportPayloads()).toBe(1);

    expect(readPayload(pendingId)).not.toBe("");
    expect(readPayload(successId)).toBe("");
    expect(clearFinishedImportPayloads()).toBe(0);
  });

  test("readImportJob still returns progress fields after the payload is cleared", () => {
    const userId = insertUser();
    const jobId = createJob(userId, blankPayload("trakt"));
    testDb
      .update(importJobs)
      .set({
        status: "error",
        totalItems: 5,
        processedItems: 3,
        importedCount: 2,
        skippedCount: 1,
        failedCount: 0,
        errors: JSON.stringify(["boom"]),
        finishedAt: new Date(),
      })
      .where(eq(importJobs.id, jobId))
      .run();
    clearFinishedImportPayloads(jobId);
    expect(readPayload(jobId)).toBe("");

    const job = readImportJob(jobId, userId);
    expect(job.status).toBe("error");
    expect(job.totalItems).toBe(5);
    expect(job.processedItems).toBe(3);
    expect(job.importedCount).toBe(2);
    expect(job.skippedCount).toBe(1);
    expect(job.errors).toEqual(["boom"]);
    expect(job.finishedAt).not.toBeNull();
  });
});
