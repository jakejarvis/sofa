import { beforeEach, describe, expect, test } from "bun:test";
import {
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "@sofa/db/schema";
import { and, eq } from "drizzle-orm";
import {
  getUserTitleInfo,
  logEpisodeWatch,
  logEpisodeWatchBatch,
  logMovieWatch,
  markAllEpisodesWatched,
  rateTitleStars,
  removeTitleStatus,
  setTitleStatus,
  unwatchEpisode,
  unwatchSeason,
} from "../src/tracking";
import {
  clearAllTables,
  insertTitle,
  insertTvShow,
  insertUser,
  testDb,
} from "./sqlite";

beforeEach(() => {
  clearAllTables();
});

// ── setTitleStatus ──────────────────────────────────────────────────

describe("setTitleStatus", () => {
  test("sets new status for a user/title pair", () => {
    insertUser();
    insertTitle();
    setTitleStatus("user-1", "title-1", "watchlist");

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, "title-1"),
        ),
      )
      .get();
    expect(row?.status).toBe("watchlist");
  });

  test("updates existing status", () => {
    insertUser();
    insertTitle();
    setTitleStatus("user-1", "title-1", "watchlist");
    setTitleStatus("user-1", "title-1", "in_progress");

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, "title-1"),
        ),
      )
      .get();
    expect(row?.status).toBe("in_progress");
  });

  test("upsert: only one row per user/title", () => {
    insertUser();
    insertTitle();
    setTitleStatus("user-1", "title-1", "watchlist");
    setTitleStatus("user-1", "title-1", "completed");

    const rows = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, "title-1"),
        ),
      )
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("completed");
  });
});

// ── removeTitleStatus ───────────────────────────────────────────────

describe("removeTitleStatus", () => {
  test("removes existing status", () => {
    insertUser();
    insertTitle();
    setTitleStatus("user-1", "title-1", "watchlist");
    removeTitleStatus("user-1", "title-1");

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, "title-1"),
        ),
      )
      .get();
    expect(row).toBeUndefined();
  });

  test("no-op when status doesn't exist", () => {
    insertUser();
    insertTitle();
    // Should not throw
    removeTitleStatus("user-1", "title-1");
  });
});

// ── logMovieWatch ───────────────────────────────────────────────────

describe("logMovieWatch", () => {
  test("inserts watch record", () => {
    insertUser();
    insertTitle();
    logMovieWatch("user-1", "title-1");

    const watches = testDb
      .select()
      .from(userMovieWatches)
      .where(eq(userMovieWatches.userId, "user-1"))
      .all();
    expect(watches).toHaveLength(1);
    expect(watches[0].titleId).toBe("title-1");
  });

  test("auto-sets status to completed when no prior status", () => {
    insertUser();
    insertTitle();
    logMovieWatch("user-1", "title-1");

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, "title-1"),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");
  });

  test("auto-upgrades watchlist to completed", () => {
    insertUser();
    insertTitle();
    setTitleStatus("user-1", "title-1", "watchlist");
    logMovieWatch("user-1", "title-1");

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, "title-1"),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");
  });

  test("auto-upgrades in_progress to completed", () => {
    insertUser();
    insertTitle();
    setTitleStatus("user-1", "title-1", "in_progress");
    logMovieWatch("user-1", "title-1");

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, "title-1"),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");
  });

  test("doesn't downgrade already-completed status", () => {
    insertUser();
    insertTitle();
    setTitleStatus("user-1", "title-1", "completed");
    logMovieWatch("user-1", "title-1");

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, "title-1"),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");
  });
});

// ── logEpisodeWatch ─────────────────────────────────────────────────

describe("logEpisodeWatch", () => {
  test("inserts watch record", () => {
    insertUser();
    const { episodeIds } = insertTvShow();
    logEpisodeWatch("user-1", episodeIds[0]);

    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, "user-1"))
      .all();
    expect(watches).toHaveLength(1);
    expect(watches[0].episodeId).toBe(episodeIds[0]);
  });

  test("auto-sets status to in_progress", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow();
    logEpisodeWatch("user-1", episodeIds[0]);

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("in_progress");
  });

  test("upgrades watchlist to in_progress", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow();
    setTitleStatus("user-1", titleId, "watchlist");
    logEpisodeWatch("user-1", episodeIds[0]);

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("in_progress");
  });

  test("doesn't downgrade completed to in_progress", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow();
    setTitleStatus("user-1", titleId, "completed");
    logEpisodeWatch("user-1", episodeIds[0]);

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");
  });

  test("auto-completes when all episodes are watched", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3);

    for (const epId of episodeIds) {
      logEpisodeWatch("user-1", epId);
    }

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");
  });
});

// ── logEpisodeWatchBatch ────────────────────────────────────────────

describe("logEpisodeWatchBatch", () => {
  test("batch inserts multiple watches", () => {
    insertUser();
    const { episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
    logEpisodeWatchBatch("user-1", episodeIds.slice(0, 2));

    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, "user-1"))
      .all();
    expect(watches).toHaveLength(2);
  });

  test("sets in_progress status", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
    logEpisodeWatchBatch("user-1", [episodeIds[0]]);

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("in_progress");
  });

  test("auto-completes if batch covers all episodes", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
    logEpisodeWatchBatch("user-1", episodeIds);

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");
  });

  test("no-op for empty array", () => {
    insertUser();
    logEpisodeWatchBatch("user-1", []);

    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, "user-1"))
      .all();
    expect(watches).toHaveLength(0);
  });
});

// ── markAllEpisodesWatched ──────────────────────────────────────────

describe("markAllEpisodesWatched", () => {
  test("marks all episodes as watched and sets completed", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
    markAllEpisodesWatched("user-1", titleId);

    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, "user-1"))
      .all();
    expect(watches).toHaveLength(episodeIds.length);

    const row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");
  });

  test("skips already-watched episodes (no duplicates)", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3);

    // Watch first episode manually
    logEpisodeWatch("user-1", episodeIds[0]);
    // Then mark all
    markAllEpisodesWatched("user-1", titleId);

    // Should have exactly 3 episode watches (1 manual + 2 new), not 4
    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, "user-1"))
      .all();
    expect(watches).toHaveLength(3);
  });

  test("no-op for movies", () => {
    insertUser();
    insertTitle({ id: "movie-1", type: "movie" });
    markAllEpisodesWatched("user-1", "movie-1");

    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, "user-1"))
      .all();
    expect(watches).toHaveLength(0);
  });
});

// ── unwatchEpisode ──────────────────────────────────────────────────

describe("unwatchEpisode", () => {
  test("removes watch record", () => {
    insertUser();
    const { episodeIds } = insertTvShow();
    logEpisodeWatch("user-1", episodeIds[0]);
    unwatchEpisode("user-1", episodeIds[0]);

    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, "user-1"))
      .all();
    expect(watches).toHaveLength(0);
  });

  test("downgrades completed to in_progress", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
    markAllEpisodesWatched("user-1", titleId);

    // Verify completed first
    let row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");

    // Unwatch one episode
    unwatchEpisode("user-1", episodeIds[0]);

    row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("in_progress");
  });

  test("doesn't change in_progress status", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
    logEpisodeWatch("user-1", episodeIds[0]);
    logEpisodeWatch("user-1", episodeIds[1]);

    // Status should be in_progress
    let row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("in_progress");

    unwatchEpisode("user-1", episodeIds[0]);

    row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("in_progress");
  });
});

// ── unwatchSeason ───────────────────────────────────────────────────

describe("unwatchSeason", () => {
  test("removes all episode watches for a season", () => {
    insertUser();
    const { episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
    for (const epId of episodeIds) {
      logEpisodeWatch("user-1", epId);
    }

    unwatchSeason("user-1", "tv-1-s1");

    const watches = testDb
      .select()
      .from(userEpisodeWatches)
      .where(eq(userEpisodeWatches.userId, "user-1"))
      .all();
    expect(watches).toHaveLength(0);
  });

  test("downgrades completed to in_progress", () => {
    insertUser();
    const { titleId } = insertTvShow("tv-1", 99999, 2, 2);

    // Watch all episodes across both seasons
    markAllEpisodesWatched("user-1", titleId);

    let row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("completed");

    // Unwatch season 1
    unwatchSeason("user-1", "tv-1-s1");

    row = testDb
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, "user-1"),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();
    expect(row?.status).toBe("in_progress");
  });
});

// ── rateTitleStars ──────────────────────────────────────────────────

describe("rateTitleStars", () => {
  test("sets rating", () => {
    insertUser();
    insertTitle();
    rateTitleStars("user-1", "title-1", 4);

    const row = testDb
      .select()
      .from(userRatings)
      .where(
        and(
          eq(userRatings.userId, "user-1"),
          eq(userRatings.titleId, "title-1"),
        ),
      )
      .get();
    expect(row?.ratingStars).toBe(4);
  });

  test("updates existing rating", () => {
    insertUser();
    insertTitle();
    rateTitleStars("user-1", "title-1", 3);
    rateTitleStars("user-1", "title-1", 5);

    const rows = testDb
      .select()
      .from(userRatings)
      .where(
        and(
          eq(userRatings.userId, "user-1"),
          eq(userRatings.titleId, "title-1"),
        ),
      )
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0].ratingStars).toBe(5);
  });

  test("deletes rating when 0", () => {
    insertUser();
    insertTitle();
    rateTitleStars("user-1", "title-1", 4);
    rateTitleStars("user-1", "title-1", 0);

    const row = testDb
      .select()
      .from(userRatings)
      .where(
        and(
          eq(userRatings.userId, "user-1"),
          eq(userRatings.titleId, "title-1"),
        ),
      )
      .get();
    expect(row).toBeUndefined();
  });
});

// ── getUserTitleInfo ────────────────────────────────────────────────

describe("getUserTitleInfo", () => {
  test("returns status, rating, and watched episode IDs", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
    setTitleStatus("user-1", titleId, "in_progress");
    rateTitleStars("user-1", titleId, 4);
    logEpisodeWatch("user-1", episodeIds[0]);
    logEpisodeWatch("user-1", episodeIds[1]);

    const info = getUserTitleInfo("user-1", titleId);
    expect(info.status).toBe("in_progress");
    expect(info.rating).toBe(4);
    expect(info.episodeWatches).toHaveLength(2);
    expect(info.episodeWatches).toContain(episodeIds[0]);
    expect(info.episodeWatches).toContain(episodeIds[1]);
  });

  test("returns nulls when no data exists", () => {
    insertUser();
    insertTitle();

    const info = getUserTitleInfo("user-1", "title-1");
    expect(info.status).toBeNull();
    expect(info.rating).toBeNull();
    expect(info.episodeWatches).toHaveLength(0);
  });
});
