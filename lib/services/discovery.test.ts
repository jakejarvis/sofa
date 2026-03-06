import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  clearAllTables,
  insertAvailabilityOffer,
  insertEpisodeWatch,
  insertMovieWatch,
  insertRating,
  insertRecommendation,
  insertStatus,
  insertTitle,
  insertTvShow,
  insertUser,
} from "@/lib/test-utils";

mock.module("@/lib/tmdb/image", () => ({
  tmdbImageUrl: (path: string | null) => path,
}));

import {
  getContinueWatchingFeed,
  getNewAvailableFeed,
  getRecommendationsFeed,
  getRecommendationsForTitle,
  getUserStats,
  getWatchCount,
  getWatchHistory,
} from "./discovery";

beforeEach(() => {
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
    const oldDate = new Date();
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
    expect(history).toBeArrayOfSize(7);
    const totalCount = history.reduce((sum, b) => sum + b.count, 0);
    expect(totalCount).toBe(2);
  });

  test("returns all-zero buckets when no watches", () => {
    insertUser();
    const history = getWatchHistory("user-1", "movies", "this_month");
    expect(history).toBeArrayOfSize(30);
    expect(history.every((b) => b.count === 0)).toBe(true);
  });

  test("returns correct bucket count for today period", () => {
    insertUser();
    const history = getWatchHistory("user-1", "episodes", "today");
    expect(history).toBeArrayOfSize(24);
  });

  test("returns correct bucket count for this_year period", () => {
    insertUser();
    const history = getWatchHistory("user-1", "movies", "this_year");
    expect(history).toBeArrayOfSize(12);
  });
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
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 3);
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
    const { titleId } = insertTvShow("tv-1", 99999, 1, 3);
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
    const show1 = insertTvShow("tv-1", 11111, 1, 3);
    const show2 = insertTvShow("tv-2", 22222, 1, 3);
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
    const { titleId, episodeIds } = insertTvShow("tv-1", 99999, 1, 2);
    insertStatus("user-1", titleId, "in_progress");
    for (const epId of episodeIds) {
      insertEpisodeWatch("user-1", epId);
    }

    const feed = getContinueWatchingFeed("user-1");
    expect(feed).toHaveLength(0);
  });
});

// ── getNewAvailableFeed ─────────────────────────────────────────────

describe("getNewAvailableFeed", () => {
  test("returns titles with availability offers", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertStatus("user-1", "m1", "watchlist");
    insertAvailabilityOffer("m1");

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
    insertAvailabilityOffer("m1");

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
});
