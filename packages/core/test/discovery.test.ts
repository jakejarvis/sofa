import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { getNextEpisode } from "@sofa/api/utils";
import {
  clearAllTables,
  insertPlatform,
  insertTitleAvailability,
  insertEpisodeWatch,
  insertMovieWatch,
  insertRating,
  insertRecommendation,
  insertStatus,
  insertTitle,
  insertTvShow,
  insertUser,
} from "@sofa/test/db";

import {
  getContinueWatchingFeed,
  getNewAvailableFeed,
  getRecommendationsFeed,
  getRecommendationsForTitle,
  getUserStats,
  getWatchCount,
  getWatchHistory,
  periodStartTimestamp,
} from "../src/discovery";

const TEST_NOW = new Date("2026-03-01T12:00:00Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TEST_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.setSystemTime(TEST_NOW);
  clearAllTables();
});

// ── getWatchCount ───────────────────────────────────────────────────

describe("getWatchCount", () => {
  test("counts movie watches within period", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    insertMovieWatch("user-1", "m1");
    insertMovieWatch("user-1", "m2");

    const count = getWatchCount("user-1", "movies", "this_month");
    expect(count).toBe(2);
  });

  test("counts episode watches within period", () => {
    insertUser();
    const { episodeIds } = insertTvShow();
    insertEpisodeWatch("user-1", episodeIds[0]);
    insertEpisodeWatch("user-1", episodeIds[1]);

    const count = getWatchCount("user-1", "episodes", "this_week");
    expect(count).toBe(2);
  });

  test("excludes watches outside period", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    // Watch from 2 years ago
    const oldDate = new Date(TEST_NOW);
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    insertMovieWatch("user-1", "m1", oldDate);

    const count = getWatchCount("user-1", "movies", "this_year");
    expect(count).toBe(0);
  });

  test("returns 0 when no watches exist", () => {
    insertUser();
    const count = getWatchCount("user-1", "movies", "today");
    expect(count).toBe(0);
  });
});

// ── getWatchHistory ─────────────────────────────────────────────────

describe("getWatchHistory", () => {
  test("returns bucketed history with correct total count", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    insertMovieWatch("user-1", "m1");
    insertMovieWatch("user-1", "m2");

    const history = getWatchHistory("user-1", "movies", "this_week");
    expect(history).toHaveLength(7);
    const totalCount = history.reduce((sum, b) => sum + b.count, 0);
    expect(totalCount).toBe(2);
  });

  test("returns all-zero buckets when no watches", () => {
    insertUser();
    const history = getWatchHistory("user-1", "movies", "this_month");
    expect(history).toHaveLength(30);
    expect(history.every((b) => b.count === 0)).toBe(true);
  });

  test("returns correct bucket count for today period", () => {
    insertUser();
    const history = getWatchHistory("user-1", "episodes", "today");
    expect(history).toHaveLength(24);
  });

  test("returns correct bucket count for this_year period", () => {
    insertUser();
    const history = getWatchHistory("user-1", "movies", "this_year");
    expect(history).toHaveLength(12);
  });
});

describe("getWatchHistory year buckets", () => {
  test("yields 12 distinct consecutive months on Oct 31", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 12));
    insertUser();
    expect(getWatchHistory("user-1", "movies", "this_year").map((b) => b.bucket)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  test("yields 12 distinct consecutive months on Mar 30", () => {
    vi.setSystemTime(new Date(2027, 2, 30, 12));
    insertUser();
    expect(getWatchHistory("user-1", "movies", "this_year").map((b) => b.bucket)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
  });
});

describe("window boundaries match chart buckets", () => {
  test.each(["today", "this_week", "this_month", "this_year"] as const)(
    "%s count equals chart sum at the window edge",
    (period) => {
      const now = new Date(2026, 6, 15, 12, 30);
      vi.setSystemTime(now);
      insertUser();
      insertTitle({ id: "inside", tmdbId: 1 });
      insertTitle({ id: "outside", tmdbId: 2 });
      const startMs = periodStartTimestamp(period, now) * 1000;
      insertMovieWatch("user-1", "inside", new Date(startMs + 60_000));
      insertMovieWatch("user-1", "outside", new Date(startMs - 60_000));

      expect(getWatchCount("user-1", "movies", period)).toBe(1);
      const sum = getWatchHistory("user-1", "movies", period).reduce((n, b) => n + b.count, 0);
      expect(sum).toBe(1);
    },
  );
});

// ── getUserStats ────────────────────────────────────────────────────

describe("getUserStats", () => {
  test("returns correct stats", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    const { titleId } = insertTvShow("tv-1", 99999, 1, 3);

    insertMovieWatch("user-1", "m1");
    insertMovieWatch("user-1", "m2");
    insertEpisodeWatch("user-1", "tv-1-s1e1");

    insertStatus("user-1", "m1", "completed");
    insertStatus("user-1", "m2", "completed");
    insertStatus("user-1", titleId, "in_progress");

    const stats = getUserStats("user-1");
    expect(stats.moviesThisMonth).toBe(2);
    expect(stats.episodesThisWeek).toBe(1);
    expect(stats.librarySize).toBe(3);
    expect(stats.completed).toBe(2);
  });

  test("returns zeros when no data", () => {
    insertUser();
    const stats = getUserStats("user-1");
    expect(stats.moviesThisMonth).toBe(0);
    expect(stats.episodesThisWeek).toBe(0);
    expect(stats.librarySize).toBe(0);
    expect(stats.completed).toBe(0);
  });
});

// ── getContinueWatchingFeed ─────────────────────────────────────────

describe("getContinueWatchingFeed", () => {
  test("returns in-progress shows with next unwatched episode", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3, {
      airDates: ["2026-01-01", "2026-01-08", "2026-01-15"],
    });
    insertStatus("user-1", titleId, "in_progress");
    insertEpisodeWatch("user-1", episodeIds[0]);

    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(1);
    expect(feed[0].title.id).toBe(titleId);
    expect(feed[0].nextEpisode?.episodeNumber).toBe(2);
    expect(feed[0].watchedEpisodes).toBe(1);
    expect(feed[0].totalEpisodes).toBe(3);
  });

  test("excludes completed shows", () => {
    insertUser();
    const { titleId } = insertTvShow("tv-1", 99999, 1, 3, {
      airDates: ["2026-01-01", "2026-01-08", "2026-01-15"],
    });
    insertStatus("user-1", titleId, "completed");

    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(0);
  });

  test("excludes movies", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1, type: "movie" });
    insertStatus("user-1", "m1", "in_progress");

    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(0);
  });

  test("returns empty when no in-progress shows", () => {
    insertUser();
    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(0);
  });

  test("sorts by most recent watch", () => {
    insertUser();
    const show1 = insertTvShow("tv-1", 11111, 1, 3, {
      airDates: ["2026-01-01", "2026-01-08", "2026-01-15"],
    });
    const show2 = insertTvShow("tv-2", 22222, 1, 3, {
      airDates: ["2026-01-01", "2026-01-08", "2026-01-15"],
    });
    insertStatus("user-1", show1.titleId, "in_progress");
    insertStatus("user-1", show2.titleId, "in_progress");

    const older = new Date("2026-01-01");
    const newer = new Date("2026-03-01");
    insertEpisodeWatch("user-1", show1.episodeIds[0], older);
    insertEpisodeWatch("user-1", show2.episodeIds[0], newer);

    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(2);
    expect(feed[0].title.id).toBe("tv-2");
    expect(feed[1].title.id).toBe("tv-1");
  });

  test("skips show when all episodes are watched (no next episode)", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 2, {
      airDates: ["2026-01-01", "2026-01-08"],
    });
    insertStatus("user-1", titleId, "in_progress");
    for (const epId of episodeIds) {
      insertEpisodeWatch("user-1", epId);
    }

    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(0);
  });

  test("excludes a caught-up show whose only unwatched episode has no air date", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3, {
      airDates: ["2026-01-01", "2026-01-08"],
    });
    insertStatus("user-1", titleId, "in_progress");
    insertEpisodeWatch("user-1", episodeIds[0]);
    insertEpisodeWatch("user-1", episodeIds[1]);

    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(0);
  });

  test("counts only aired episodes in totals", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 4, {
      airDates: ["2026-01-01", "2026-01-08", "2026-01-15"],
    });
    insertStatus("user-1", titleId, "in_progress");
    insertEpisodeWatch("user-1", episodeIds[0]);

    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(1);
    expect(feed[0].totalEpisodes).toBe(3);
    expect(feed[0].watchedEpisodes).toBe(1);
    expect(feed[0].nextEpisode?.episodeNumber).toBe(2);
  });

  test("skips future-dated episodes", () => {
    insertUser();
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 2, {
      airDates: ["2026-01-01", "2026-12-01"],
    });
    insertStatus("user-1", titleId, "in_progress");
    insertEpisodeWatch("user-1", episodeIds[0]);

    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(0);
  });
});

// ── getNextEpisode (client mirror) ──────────────────────────────────

describe("getNextEpisode (client mirror)", () => {
  test("treats undated episodes as unaired and counts only aired episodes", () => {
    const seasons = [
      {
        seasonNumber: 1,
        episodes: [
          {
            id: "e1",
            episodeNumber: 1,
            name: "E1",
            airDate: "2026-01-01",
            stillPath: null,
            stillThumbHash: null,
          },
          {
            id: "e2",
            episodeNumber: 2,
            name: "E2",
            airDate: "2026-01-08",
            stillPath: null,
            stillThumbHash: null,
          },
          {
            id: "e3",
            episodeNumber: 3,
            name: "E3",
            airDate: null,
            stillPath: null,
            stillThumbHash: null,
          },
        ],
      },
    ] as never;

    const result = getNextEpisode(seasons, new Set(["e1"]));
    expect(result.nextEpisode?.episodeNumber).toBe(2);
    expect(result.totalEpisodes).toBe(2);
    expect(result.watchedEpisodes).toBe(1);
  });
});

// ── getNewAvailableFeed ─────────────────────────────────────────────

describe("getNewAvailableFeed", () => {
  test("returns titles with availability offers", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertStatus("user-1", "m1", "watchlist");
    const pId = insertPlatform({ id: "p-m1", tmdbProviderId: 8 });
    insertTitleAvailability("m1", pId);

    const feed = getNewAvailableFeed("user-1");
    expect(feed).toHaveLength(1);
    expect(feed[0].titleId).toBe("m1");
  });

  test("excludes titles without availability", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertStatus("user-1", "m1", "watchlist");

    const feed = getNewAvailableFeed("user-1");
    expect(feed).toHaveLength(0);
  });

  test("excludes titles not in user library", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    const pId = insertPlatform({ id: "p-m1", tmdbProviderId: 8 });
    insertTitleAvailability("m1", pId);

    const feed = getNewAvailableFeed("user-1");
    expect(feed).toHaveLength(0);
  });
});

// ── getRecommendationsFeed ──────────────────────────────────────────

describe("getRecommendationsFeed", () => {
  test("returns recommendations from completed titles", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1, title: "Source Movie" });
    insertTitle({ id: "m2", tmdbId: 2, title: "Recommended Movie" });
    insertStatus("user-1", "m1", "completed");
    insertRecommendation("m1", "m2", { rank: 1 });

    const feed = getRecommendationsFeed("user-1");
    expect(feed).toHaveLength(1);
    expect(feed[0]?.id).toBe("m2");
  });

  test("returns recommendations from highly-rated titles", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    insertStatus("user-1", "m1", "watchlist");
    insertRating("user-1", "m1", 5);
    insertRecommendation("m1", "m2", { rank: 1 });

    const feed = getRecommendationsFeed("user-1");
    expect(feed).toHaveLength(1);
  });

  test("excludes already-tracked titles", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    insertStatus("user-1", "m1", "completed");
    insertStatus("user-1", "m2", "watchlist");
    insertRecommendation("m1", "m2", { rank: 1 });

    const feed = getRecommendationsFeed("user-1");
    expect(feed).toHaveLength(0);
  });

  test("excludes rated titles that are not in the library", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    insertTitle({ id: "m3", tmdbId: 3 });
    insertRating("user-1", "m1", 5);
    insertRating("user-1", "m2", 5);
    insertRecommendation("m1", "m2", { rank: 1 });
    insertRecommendation("m1", "m3", { rank: 2 });

    const ids = getRecommendationsFeed("user-1").map((t) => t?.id);
    expect(ids).toContain("m3");
    expect(ids).not.toContain("m2");
  });

  test("excludes watched movies that are not in the library", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    insertTitle({ id: "m3", tmdbId: 3 });
    insertStatus("user-1", "m1", "completed");
    insertMovieWatch("user-1", "m2");
    insertRecommendation("m1", "m2", { rank: 1 });
    insertRecommendation("m1", "m3", { rank: 2 });

    const ids = getRecommendationsFeed("user-1").map((t) => t?.id);
    expect(ids).toContain("m3");
    expect(ids).not.toContain("m2");
  });

  test("excludes shows with watched episodes that are not in the library", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m3", tmdbId: 3 });
    const { episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
    insertStatus("user-1", "m1", "completed");
    insertEpisodeWatch("user-1", episodeIds[0]!);
    insertRecommendation("m1", "tv-1", { rank: 1 });
    insertRecommendation("m1", "m3", { rank: 2 });

    const ids = getRecommendationsFeed("user-1").map((t) => t?.id);
    expect(ids).toContain("m3");
    expect(ids).not.toContain("tv-1");
  });

  test("returns empty when no source titles", () => {
    insertUser();
    const feed = getRecommendationsFeed("user-1");
    expect(feed).toHaveLength(0);
  });

  test("scores higher when recommended by multiple sources", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    insertTitle({ id: "m3", tmdbId: 3 });
    insertTitle({ id: "rec1", tmdbId: 10, title: "Double Recommended" });
    insertTitle({ id: "rec2", tmdbId: 20, title: "Single Recommended" });
    insertStatus("user-1", "m1", "completed");
    insertStatus("user-1", "m2", "completed");

    // rec1 recommended by both m1 and m2
    insertRecommendation("m1", "rec1", { rank: 1 });
    insertRecommendation("m2", "rec1", { rank: 1 });
    // rec2 recommended only by m1
    insertRecommendation("m1", "rec2", { rank: 1 });

    const feed = getRecommendationsFeed("user-1");
    expect(feed).toHaveLength(2);
    expect(feed[0]?.id).toBe("rec1");
  });
});

// ── getRecommendationsForTitle ──────────────────────────────────────

describe("getRecommendationsForTitle", () => {
  test("returns ordered recommendations for a title", () => {
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "rec1", tmdbId: 10, title: "Rec One" });
    insertTitle({ id: "rec2", tmdbId: 20, title: "Rec Two" });
    insertRecommendation("m1", "rec1", { rank: 2 });
    insertRecommendation("m1", "rec2", { rank: 1 });

    const recs = getRecommendationsForTitle("m1");
    expect(recs).toHaveLength(2);
    expect(recs[0].title).toBe("Rec Two");
    expect(recs[1].title).toBe("Rec One");
  });

  test("returns empty for unknown title", () => {
    const recs = getRecommendationsForTitle("nonexistent");
    expect(recs).toHaveLength(0);
  });

  test("returns empty when no recommendations exist", () => {
    insertTitle({ id: "m1", tmdbId: 1 });
    const recs = getRecommendationsForTitle("m1");
    expect(recs).toHaveLength(0);
  });

  test("deduplicates titles returned by multiple recommendation sources", () => {
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "rec1", tmdbId: 10, title: "Rec One" });
    insertTitle({ id: "rec2", tmdbId: 20, title: "Rec Two" });
    insertRecommendation("m1", "rec1", {
      source: "tmdb_similar",
      rank: 1,
    });
    insertRecommendation("m1", "rec1", {
      source: "tmdb_recommendations",
      rank: 2,
    });
    insertRecommendation("m1", "rec2", {
      source: "tmdb_recommendations",
      rank: 3,
    });

    const recs = getRecommendationsForTitle("m1");
    expect(recs).toHaveLength(2);
    expect(recs.map((rec) => rec.id)).toEqual(["rec1", "rec2"]);
  });
});
