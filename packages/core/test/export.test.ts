import { beforeEach, describe, expect, test } from "vitest";

import {
  clearAllTables,
  insertEpisodeWatch,
  insertMovieWatch,
  insertRating,
  insertStatus,
  insertTitle,
  insertTvShow,
  insertUser,
} from "@sofa/test/db";

import { generateUserExport } from "../src/export";

beforeEach(() => clearAllTables());

describe("generateUserExport", () => {
  test("exports empty data for user with no tracking", () => {
    insertUser("user-1");

    const result = generateUserExport("user-1", { name: "Test", email: "test@example.com" });

    expect(result.version).toBe(1);
    expect(result.user).toEqual({ name: "Test", email: "test@example.com" });
    expect(result.library).toHaveLength(0);
    expect(result.movieWatches).toHaveLength(0);
    expect(result.episodeWatches).toHaveLength(0);
    expect(result.ratings).toHaveLength(0);
    expect(result.exportedAt).toBeTruthy();
  });

  test("exports library statuses", () => {
    insertUser("user-1");
    insertTitle({
      id: "t1",
      tmdbId: 550,
      type: "movie",
      title: "Fight Club",
      releaseDate: "1999-10-15",
    });
    insertTitle({ id: "t2", tmdbId: 1396, type: "tv", title: "Breaking Bad" });
    insertTitle({ id: "t3", tmdbId: 100, type: "movie", title: "Watchlisted" });

    insertStatus("user-1", "t1", "completed");
    insertStatus("user-1", "t2", "in_progress");
    insertStatus("user-1", "t3", "watchlist");

    const result = generateUserExport("user-1", { name: "Test", email: "t@t.com" });

    expect(result.library).toHaveLength(3);

    const fightClub = result.library.find((l) => l.tmdbId === 550);
    expect(fightClub?.status).toBe("completed");
    expect(fightClub?.type).toBe("movie");
    expect(fightClub?.title).toBe("Fight Club");
    expect(fightClub?.year).toBe(1999);

    const bb = result.library.find((l) => l.tmdbId === 1396);
    expect(bb?.status).toBe("in_progress");
    expect(bb?.type).toBe("tv");
  });

  test("exports movie watches", () => {
    insertUser("user-1");
    insertTitle({
      id: "t1",
      tmdbId: 550,
      type: "movie",
      title: "Fight Club",
      releaseDate: "1999-10-15",
    });

    const watchedAt = new Date("2025-06-15T20:00:00.000Z");
    insertMovieWatch("user-1", "t1", watchedAt);

    const result = generateUserExport("user-1", { name: "Test", email: "t@t.com" });

    expect(result.movieWatches).toHaveLength(1);
    expect(result.movieWatches[0].tmdbId).toBe(550);
    expect(result.movieWatches[0].title).toBe("Fight Club");
    expect(result.movieWatches[0].year).toBe(1999);
    expect(result.movieWatches[0].watchedAt).toBe(watchedAt.toISOString());
  });

  test("exports episode watches with show context", () => {
    insertUser("user-1");
    const { episodeIds } = insertTvShow("tv-1", 1396, 1, 2, { title: "Breaking Bad" });

    const watchedAt = new Date("2025-02-01T20:00:00.000Z");
    insertEpisodeWatch("user-1", episodeIds[0], watchedAt);

    const result = generateUserExport("user-1", { name: "Test", email: "t@t.com" });

    expect(result.episodeWatches).toHaveLength(1);
    expect(result.episodeWatches[0].showTmdbId).toBe(1396);
    expect(result.episodeWatches[0].showTitle).toBe("Breaking Bad");
    expect(result.episodeWatches[0].seasonNumber).toBe(1);
    expect(result.episodeWatches[0].episodeNumber).toBe(1);
    expect(result.episodeWatches[0].episodeName).toBe("S1E1");
    expect(result.episodeWatches[0].watchedAt).toBe(watchedAt.toISOString());
  });

  test("exports ratings", () => {
    insertUser("user-1");
    insertTitle({
      id: "t1",
      tmdbId: 550,
      type: "movie",
      title: "Fight Club",
      releaseDate: "1999-10-15",
    });
    insertRating("user-1", "t1", 5);

    const result = generateUserExport("user-1", { name: "Test", email: "t@t.com" });

    expect(result.ratings).toHaveLength(1);
    expect(result.ratings[0].tmdbId).toBe(550);
    expect(result.ratings[0].type).toBe("movie");
    expect(result.ratings[0].rating).toBe(5);
  });

  test("does not include other users data", () => {
    insertUser("user-1");
    insertUser("user-2");
    insertTitle({ id: "t1", tmdbId: 550, type: "movie", title: "Fight Club" });
    insertTitle({ id: "t2", tmdbId: 100, type: "movie", title: "Other Movie" });

    insertStatus("user-1", "t1", "completed");
    insertMovieWatch("user-1", "t1");
    insertRating("user-1", "t1", 5);

    insertStatus("user-2", "t2", "watchlist");
    insertMovieWatch("user-2", "t2");
    insertRating("user-2", "t2", 3);

    const result = generateUserExport("user-1", { name: "Test", email: "t@t.com" });

    expect(result.library).toHaveLength(1);
    expect(result.library[0].tmdbId).toBe(550);
    expect(result.movieWatches).toHaveLength(1);
    expect(result.movieWatches[0].tmdbId).toBe(550);
    expect(result.ratings).toHaveLength(1);
    expect(result.ratings[0].tmdbId).toBe(550);
  });
});
