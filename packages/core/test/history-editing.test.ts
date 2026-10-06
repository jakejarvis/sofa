import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";

import { userEpisodeWatches, userMovieWatches, userTitleStatus } from "@sofa/db/schema";
import {
  clearAllTables,
  insertStatus,
  insertTitle,
  insertTvShow,
  insertUser,
  testDb,
} from "@sofa/test/db";

import { deleteWatch, logWatchAt } from "../src/tracking";

function movieWatchRows(userId: string, titleId: string) {
  return testDb
    .select()
    .from(userMovieWatches)
    .where(eq(userMovieWatches.titleId, titleId))
    .all()
    .filter((r) => r.userId === userId);
}

function episodeWatchRows(userId: string) {
  return testDb
    .select()
    .from(userEpisodeWatches)
    .all()
    .filter((r) => r.userId === userId);
}

function statusOf(userId: string, titleId: string) {
  return testDb
    .select()
    .from(userTitleStatus)
    .all()
    .find((r) => r.userId === userId && r.titleId === titleId)?.status;
}

function addMovieWatch(id: string, userId: string, titleId: string) {
  testDb
    .insert(userMovieWatches)
    .values({ id, userId, titleId, watchedAt: new Date(), source: "manual" })
    .run();
}

function addEpisodeWatch(id: string, userId: string, episodeId: string) {
  testDb
    .insert(userEpisodeWatches)
    .values({ id, userId, episodeId, watchedAt: new Date(), source: "manual" })
    .run();
}

beforeEach(() => {
  clearAllTables();
  insertUser("user-1");
  insertUser("user-2");
  insertTitle({ id: "m1", tmdbId: 1, title: "Movie One" });
  insertTvShow("tv-1", 100, 1, 3);
});

describe("deleteWatch", () => {
  test("deleting one of two movie watches keeps completed", () => {
    insertStatus("user-1", "m1", "completed");
    addMovieWatch("w1", "user-1", "m1");
    addMovieWatch("w2", "user-1", "m1");

    expect(deleteWatch("user-1", "movie", "w1")).toBe(true);
    expect(movieWatchRows("user-1", "m1")).toHaveLength(1);
    expect(statusOf("user-1", "m1")).toBe("completed");
  });

  test("deleting the last movie watch sets watchlist", () => {
    insertStatus("user-1", "m1", "completed");
    addMovieWatch("w1", "user-1", "m1");

    expect(deleteWatch("user-1", "movie", "w1")).toBe(true);
    expect(movieWatchRows("user-1", "m1")).toHaveLength(0);
    expect(statusOf("user-1", "m1")).toBe("watchlist");
  });

  test("deleting the only episode watch of an in-progress show sets watchlist", () => {
    insertStatus("user-1", "tv-1", "in_progress");
    addEpisodeWatch("e1", "user-1", "tv-1-s1e1");

    expect(deleteWatch("user-1", "episode", "e1")).toBe(true);
    expect(statusOf("user-1", "tv-1")).toBe("watchlist");
  });

  test("deleting one of two episode watches keeps in_progress", () => {
    insertStatus("user-1", "tv-1", "in_progress");
    addEpisodeWatch("e1", "user-1", "tv-1-s1e1");
    addEpisodeWatch("e2", "user-1", "tv-1-s1e2");

    expect(deleteWatch("user-1", "episode", "e1")).toBe(true);
    expect(episodeWatchRows("user-1")).toHaveLength(1);
    expect(statusOf("user-1", "tv-1")).toBe("in_progress");
  });

  test("another user's watch is not deleted", () => {
    insertStatus("user-1", "m1", "completed");
    addMovieWatch("w1", "user-1", "m1");
    addEpisodeWatch("e1", "user-1", "tv-1-s1e1");

    expect(deleteWatch("user-2", "movie", "w1")).toBe(false);
    expect(deleteWatch("user-2", "episode", "e1")).toBe(false);
    expect(movieWatchRows("user-1", "m1")).toHaveLength(1);
    expect(episodeWatchRows("user-1")).toHaveLength(1);
    expect(statusOf("user-1", "m1")).toBe("completed");
  });
});

describe("logWatchAt", () => {
  test("logs a movie on a past date and sets completed", () => {
    const at = new Date("2024-03-01T12:00:00Z");
    expect(logWatchAt("user-1", "movie", "m1", at)).toBe("ok");
    const rows = movieWatchRows("user-1", "m1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.watchedAt.getTime()).toBe(at.getTime());
    expect(statusOf("user-1", "m1")).toBe("completed");
  });

  test("allows a rewatch of an already watched movie", () => {
    insertStatus("user-1", "m1", "completed");
    addMovieWatch("w1", "user-1", "m1");

    expect(logWatchAt("user-1", "movie", "m1", new Date("2024-03-01T12:00:00Z"))).toBe("ok");
    expect(movieWatchRows("user-1", "m1")).toHaveLength(2);
  });

  test("logs an episode and moves watchlist to in_progress", () => {
    insertStatus("user-1", "tv-1", "watchlist");
    expect(logWatchAt("user-1", "episode", "tv-1-s1e1", new Date("2024-03-01T12:00:00Z"))).toBe(
      "ok",
    );
    expect(episodeWatchRows("user-1")).toHaveLength(1);
    expect(statusOf("user-1", "tv-1")).toBe("in_progress");
  });

  test("returns not_found for a TV title as movie, or unknown ids", () => {
    const at = new Date("2024-03-01T12:00:00Z");
    expect(logWatchAt("user-1", "movie", "tv-1", at)).toBe("not_found");
    expect(logWatchAt("user-1", "movie", "nope", at)).toBe("not_found");
    expect(logWatchAt("user-1", "episode", "nope", at)).toBe("not_found");
    expect(movieWatchRows("user-1", "tv-1")).toHaveLength(0);
  });
});
