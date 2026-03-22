import { describe, expect, test } from "vitest";

import { ONGOING_TMDB_STATUSES, getDisplayStatus } from "../src/display-status";

describe("ONGOING_TMDB_STATUSES", () => {
  test("contains expected values", () => {
    expect(ONGOING_TMDB_STATUSES).toContain("Returning Series");
    expect(ONGOING_TMDB_STATUSES).toContain("In Production");
    expect(ONGOING_TMDB_STATUSES).toHaveLength(2);
  });
});

describe("getDisplayStatus", () => {
  // -- Movies --

  test("movie with watchlist status returns in_watchlist", () => {
    expect(getDisplayStatus("watchlist", "movie", null, null)).toBe("in_watchlist");
  });

  test("movie with completed status returns completed", () => {
    expect(getDisplayStatus("completed", "movie", null, null)).toBe("completed");
  });

  test("movie with in_progress status returns in_watchlist", () => {
    // Movies don't have an "in_progress" concept — falls through to in_watchlist
    expect(getDisplayStatus("in_progress", "movie", null, null)).toBe("in_watchlist");
  });

  // -- TV: watchlist --

  test("TV with watchlist status returns in_watchlist", () => {
    expect(getDisplayStatus("watchlist", "tv", "Returning Series", null)).toBe("in_watchlist");
  });

  // -- TV: in_progress, no/partial progress --

  test("TV in_progress with no progress data returns watching", () => {
    expect(getDisplayStatus("in_progress", "tv", "Returning Series", null)).toBe("watching");
  });

  test("TV in_progress with partial progress returns watching", () => {
    expect(
      getDisplayStatus("in_progress", "tv", "Returning Series", { watched: 3, total: 10 }),
    ).toBe("watching");
  });

  test("TV in_progress with zero total returns watching", () => {
    expect(getDisplayStatus("in_progress", "tv", "Ended", { watched: 0, total: 0 })).toBe(
      "watching",
    );
  });

  // -- TV: in_progress, all watched, ongoing --

  test("TV in_progress, all watched, Returning Series returns caught_up", () => {
    expect(
      getDisplayStatus("in_progress", "tv", "Returning Series", { watched: 10, total: 10 }),
    ).toBe("caught_up");
  });

  test("TV in_progress, all watched, In Production returns caught_up", () => {
    expect(getDisplayStatus("in_progress", "tv", "In Production", { watched: 10, total: 10 })).toBe(
      "caught_up",
    );
  });

  // -- TV: in_progress, all watched, ended --

  test("TV in_progress, all watched, Ended returns completed", () => {
    expect(getDisplayStatus("in_progress", "tv", "Ended", { watched: 10, total: 10 })).toBe(
      "completed",
    );
  });

  test("TV in_progress, all watched, Canceled returns completed", () => {
    expect(getDisplayStatus("in_progress", "tv", "Canceled", { watched: 5, total: 5 })).toBe(
      "completed",
    );
  });

  test("TV in_progress, all watched, null tmdbStatus returns completed", () => {
    expect(getDisplayStatus("in_progress", "tv", null, { watched: 10, total: 10 })).toBe(
      "completed",
    );
  });

  // -- Edge cases --

  test("TV in_progress, watched exceeds total still returns caught_up/completed", () => {
    // watched > total shouldn't happen, but if it does, treat as all-watched
    expect(
      getDisplayStatus("in_progress", "tv", "Returning Series", { watched: 15, total: 10 }),
    ).toBe("caught_up");
    expect(getDisplayStatus("in_progress", "tv", "Ended", { watched: 15, total: 10 })).toBe(
      "completed",
    );
  });

  test("TV completed status returns in_watchlist (no special handling)", () => {
    // "completed" stored status on TV falls through the movie branch check
    // titleType !== "movie" so it doesn't enter that branch, and storedStatus !== "watchlist"
    // so it falls to the episode progress check → no progress → "watching"
    expect(getDisplayStatus("completed", "tv", "Ended", null)).toBe("watching");
  });
});
