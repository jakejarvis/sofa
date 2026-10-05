import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  clearAllTables,
  insertEpisodeWatch,
  insertMovieWatch,
  insertStatus,
  insertTitle,
  insertTvShow,
  insertUser,
} from "@sofa/test/db";

import { getFilteredLibraryFeed, getLibraryGenresList } from "../src/library";

const defaultFilters = { sortBy: "added_at", sortDirection: "desc" as const, page: 1, limit: 20 };

beforeAll(() => clearAllTables());
beforeEach(() => clearAllTables());

// ── getFilteredLibraryFeed ─────────────────────────────────────────────

describe("getFilteredLibraryFeed", () => {
  test("returns first page with correct pagination metadata", () => {
    insertUser();
    for (let i = 1; i <= 25; i++) {
      insertTitle({ id: `m${i}`, tmdbId: i });
      insertStatus("user-1", `m${i}`, "watchlist");
    }

    const result = getFilteredLibraryFeed("user-1", { ...defaultFilters });
    expect(result.items).toHaveLength(20);
    expect(result.page).toBe(1);
    expect(result.totalResults).toBe(25);
    expect(result.totalPages).toBe(2);
  });

  test("returns second page with remaining items", () => {
    insertUser();
    for (let i = 1; i <= 25; i++) {
      insertTitle({ id: `m${i}`, tmdbId: i });
      insertStatus("user-1", `m${i}`, "watchlist");
    }

    const result = getFilteredLibraryFeed("user-1", { ...defaultFilters, page: 2 });
    expect(result.items).toHaveLength(5);
    expect(result.page).toBe(2);
    expect(result.totalResults).toBe(25);
    expect(result.totalPages).toBe(2);
  });

  test("custom limit respected", () => {
    insertUser();
    for (let i = 1; i <= 10; i++) {
      insertTitle({ id: `m${i}`, tmdbId: i });
      insertStatus("user-1", `m${i}`, "watchlist");
    }

    const result = getFilteredLibraryFeed("user-1", { ...defaultFilters, limit: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.totalPages).toBe(2);
    expect(result.totalResults).toBe(10);
  });

  test("empty page beyond total returns empty items", () => {
    insertUser();
    for (let i = 1; i <= 5; i++) {
      insertTitle({ id: `m${i}`, tmdbId: i });
      insertStatus("user-1", `m${i}`, "watchlist");
    }

    const result = getFilteredLibraryFeed("user-1", { ...defaultFilters, page: 2 });
    expect(result.items).toHaveLength(0);
    expect(result.page).toBe(2);
  });

  test("pages are disjoint and cover all items", () => {
    insertUser();
    for (let i = 1; i <= 4; i++) {
      insertTitle({ id: `m${i}`, tmdbId: i });
      insertStatus("user-1", `m${i}`, "watchlist");
    }

    const page1 = getFilteredLibraryFeed("user-1", { ...defaultFilters, limit: 2 });
    const page2 = getFilteredLibraryFeed("user-1", { ...defaultFilters, page: 2, limit: 2 });

    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);

    const allTitleIds = new Set([
      ...page1.items.map((i) => i.titleId),
      ...page2.items.map((i) => i.titleId),
    ]);
    expect(allTitleIds.size).toBe(4);
  });

  test("filters by type", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1, type: "movie" });
    insertTitle({ id: "t1", tmdbId: 2, type: "tv" });
    insertStatus("user-1", "m1", "watchlist");
    insertStatus("user-1", "t1", "watchlist");

    const movies = getFilteredLibraryFeed("user-1", { ...defaultFilters, type: "movie" });
    expect(movies.items).toHaveLength(1);
    expect(movies.items[0]!.type).toBe("movie");

    const tv = getFilteredLibraryFeed("user-1", { ...defaultFilters, type: "tv" });
    expect(tv.items).toHaveLength(1);
    expect(tv.items[0]!.type).toBe("tv");
  });

  test("filters by search text", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1, title: "The Matrix" });
    insertTitle({ id: "m2", tmdbId: 2, title: "Inception" });
    insertStatus("user-1", "m1", "watchlist");
    insertStatus("user-1", "m2", "watchlist");

    const result = getFilteredLibraryFeed("user-1", { ...defaultFilters, search: "matrix" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.title).toBe("The Matrix");
  });

  test("filters by status", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    insertStatus("user-1", "m1", "watchlist");
    insertStatus("user-1", "m2", "completed");

    const watchlist = getFilteredLibraryFeed("user-1", {
      ...defaultFilters,
      statuses: ["in_watchlist"],
    });
    expect(watchlist.items).toHaveLength(1);

    const completed = getFilteredLibraryFeed("user-1", {
      ...defaultFilters,
      statuses: ["completed"],
    });
    expect(completed.items).toHaveLength(1);
  });
});

// ── getLibraryGenresList ──────────────────────────────────────────────

describe("getFilteredLibraryFeed last_watched sort", () => {
  test("orders by most recent watch (movies and shows) with unwatched last", () => {
    insertUser();
    insertTitle({ id: "old-movie", tmdbId: 1 });
    insertTitle({ id: "never", tmdbId: 2 });
    insertTitle({ id: "recent-movie", tmdbId: 3 });
    const { episodeIds } = insertTvShow("show", 4, 1, 2);
    for (const id of ["old-movie", "never", "recent-movie", "show"]) {
      insertStatus("user-1", id, "watchlist");
    }
    insertMovieWatch("user-1", "old-movie", new Date("2024-01-01T00:00:00Z"));
    insertMovieWatch("user-1", "recent-movie", new Date("2024-03-01T00:00:00Z"));
    insertEpisodeWatch("user-1", episodeIds[0], new Date("2024-02-01T00:00:00Z"));
    insertEpisodeWatch("user-1", episodeIds[1], new Date("2024-02-10T00:00:00Z"));

    const desc = getFilteredLibraryFeed("user-1", { ...defaultFilters, sortBy: "last_watched" });
    expect(desc.items.map((i) => i.titleId)).toEqual([
      "recent-movie",
      "show",
      "old-movie",
      "never",
    ]);

    const asc = getFilteredLibraryFeed("user-1", {
      ...defaultFilters,
      sortBy: "last_watched",
      sortDirection: "asc",
    });
    expect(asc.items.map((i) => i.titleId)).toEqual(["old-movie", "show", "recent-movie", "never"]);
  });
});

describe("getLibraryGenresList", () => {
  test("returns empty array when user has no titles", () => {
    insertUser();
    const genres = getLibraryGenresList("user-1");
    expect(genres).toEqual([]);
  });
});
