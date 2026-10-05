import { beforeEach, describe, expect, test } from "vitest";

import { userEpisodeWatches, userMovieWatches } from "@sofa/db/schema";
import { clearAllTables, insertTitle, insertTvShow, insertUser, testDb } from "@sofa/test/db";

import { listWatchHistory } from "../src/tracking";

type Source = "manual" | "import" | "plex" | "jellyfin" | "emby";

function movieWatch(
  id: string,
  userId: string,
  titleId: string,
  at: number,
  source: Source = "manual",
) {
  testDb
    .insert(userMovieWatches)
    .values({ id, userId, titleId, watchedAt: new Date(at * 1000), source })
    .run();
}

function episodeWatch(
  id: string,
  userId: string,
  episodeId: string,
  at: number,
  source: Source = "manual",
) {
  testDb
    .insert(userEpisodeWatches)
    .values({ id, userId, episodeId, watchedAt: new Date(at * 1000), source })
    .run();
}

beforeEach(() => {
  clearAllTables();
  insertUser("user-1");
  insertUser("user-2");
  insertTitle({ id: "m1", tmdbId: 1, title: "Movie One" });
  insertTitle({ id: "m2", tmdbId: 2, title: "Movie Two" });
  insertTvShow("tv-1", 100, 1, 3);
});

function ids(items: { watchId: string }[]) {
  return items.map((i) => i.watchId);
}

describe("listWatchHistory", () => {
  test("merges movies and episodes newest-first with episode details", () => {
    movieWatch("w1", "user-1", "m1", 1000);
    episodeWatch("w2", "user-1", "tv-1-s1e1", 3000);
    movieWatch("w3", "user-1", "m2", 2000);

    const { items, nextCursor } = listWatchHistory("user-1", { limit: 10 });
    expect(ids(items)).toEqual(["w2", "w3", "w1"]);
    expect(nextCursor).toBeNull();
    expect(items[0].kind).toBe("episode");
    expect(items[0].episode).toMatchObject({ seasonNumber: 1, episodeNumber: 1 });
    expect(items[0].title.id).toBe("tv-1");
    expect(items[1].kind).toBe("movie");
    expect(items[1].episode).toBeNull();
  });

  test("respects limit and returns null cursor on the last page", () => {
    for (let i = 1; i <= 5; i++) movieWatch(`w${i}`, "user-1", "m1", i * 100);

    const p1 = listWatchHistory("user-1", { limit: 2 });
    expect(ids(p1.items)).toEqual(["w5", "w4"]);
    expect(p1.nextCursor).not.toBeNull();

    const p2 = listWatchHistory("user-1", { limit: 2, cursor: p1.nextCursor! });
    expect(ids(p2.items)).toEqual(["w3", "w2"]);
    expect(p2.nextCursor).not.toBeNull();

    const p3 = listWatchHistory("user-1", { limit: 2, cursor: p2.nextCursor! });
    expect(ids(p3.items)).toEqual(["w1"]);
    expect(p3.nextCursor).toBeNull();
  });

  test("paginates without duplicates or gaps when watches share a timestamp", () => {
    // Same watchedAt across movies and episodes; ties broken by id desc.
    movieWatch("a1", "user-1", "m1", 500);
    movieWatch("a3", "user-1", "m2", 500);
    episodeWatch("a2", "user-1", "tv-1-s1e1", 500);
    episodeWatch("a4", "user-1", "tv-1-s1e2", 500);
    movieWatch("a0", "user-1", "m1", 400);
    episodeWatch("a5", "user-1", "tv-1-s1e3", 600);

    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 10; guard++) {
      const page = listWatchHistory("user-1", { limit: 2, cursor });
      seen.push(...ids(page.items));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(seen).toEqual(["a5", "a4", "a3", "a2", "a1", "a0"]);
  });

  test("ignores an invalid cursor", () => {
    movieWatch("w1", "user-1", "m1", 100);
    const { items } = listWatchHistory("user-1", { limit: 10, cursor: "not-a-cursor" });
    expect(items).toHaveLength(1);
  });

  test("filters by type", () => {
    movieWatch("w1", "user-1", "m1", 100);
    episodeWatch("w2", "user-1", "tv-1-s1e1", 200);

    expect(ids(listWatchHistory("user-1", { limit: 10, type: "movie" }).items)).toEqual(["w1"]);
    expect(ids(listWatchHistory("user-1", { limit: 10, type: "tv" }).items)).toEqual(["w2"]);
  });

  test("filters by source", () => {
    movieWatch("w1", "user-1", "m1", 100, "plex");
    movieWatch("w2", "user-1", "m2", 200, "manual");
    episodeWatch("w3", "user-1", "tv-1-s1e1", 300, "plex");

    const { items } = listWatchHistory("user-1", { limit: 10, source: "plex" });
    expect(ids(items)).toEqual(["w3", "w1"]);
  });

  test("never includes other users' watches", () => {
    movieWatch("w1", "user-1", "m1", 100);
    movieWatch("w2", "user-2", "m1", 200);
    episodeWatch("w3", "user-2", "tv-1-s1e1", 300);

    const { items } = listWatchHistory("user-1", { limit: 10 });
    expect(ids(items)).toEqual(["w1"]);
  });
});
