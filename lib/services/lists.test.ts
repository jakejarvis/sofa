import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  clearAllTables,
  insertIntegration,
  insertStatus,
  insertTitle,
  insertUser,
} from "@/lib/test-utils";
import {
  getRadarrList,
  getSonarrList,
  parseStatusParam,
  resolveListToken,
} from "./lists";

// Mock getTvExternalIds for lazy resolution tests
const mockGetTvExternalIds = mock(() =>
  Promise.resolve({ tvdb_id: 55555, imdb_id: "tt9999999" }),
);
mock.module("@/lib/tmdb/client", () => ({
  getTvExternalIds: mockGetTvExternalIds,
}));

beforeEach(() => {
  clearAllTables();
  mockGetTvExternalIds.mockClear();
});

describe("resolveListToken", () => {
  test("returns userId and provider for valid sonarr token", () => {
    insertUser("user-1");
    insertIntegration("user-1", "sonarr", "sonarr-token");
    expect(resolveListToken("sonarr-token")).toEqual({
      userId: "user-1",
      provider: "sonarr",
    });
  });

  test("returns userId and provider for valid radarr token", () => {
    insertUser("user-1");
    insertIntegration("user-1", "radarr", "radarr-token");
    expect(resolveListToken("radarr-token")).toEqual({
      userId: "user-1",
      provider: "radarr",
    });
  });

  test("returns null for invalid token", () => {
    expect(resolveListToken("nonexistent")).toBeNull();
  });

  test("returns null for webhook-type token", () => {
    insertUser("user-1");
    insertIntegration("user-1", "plex", "plex-token");
    expect(resolveListToken("plex-token")).toBeNull();
  });
});

describe("parseStatusParam", () => {
  test("defaults to watchlist when null", () => {
    expect(parseStatusParam(null)).toEqual(["watchlist"]);
  });

  test("parses comma-separated statuses", () => {
    expect(parseStatusParam("watchlist,in_progress")).toEqual([
      "watchlist",
      "in_progress",
    ]);
  });

  test("filters invalid statuses", () => {
    expect(parseStatusParam("watchlist,invalid,completed")).toEqual([
      "watchlist",
      "completed",
    ]);
  });

  test("defaults to watchlist when all invalid", () => {
    expect(parseStatusParam("foo,bar")).toEqual(["watchlist"]);
  });
});

describe("getRadarrList", () => {
  test("returns movie TMDB IDs on watchlist", () => {
    insertUser("user-1");
    insertTitle({ id: "m1", tmdbId: 100, type: "movie" });
    insertTitle({ id: "m2", tmdbId: 200, type: "movie" });
    insertStatus("user-1", "m1", "watchlist");
    insertStatus("user-1", "m2", "watchlist");

    const list = getRadarrList("user-1");
    expect(list).toEqual(expect.arrayContaining([{ Id: 100 }, { Id: 200 }]));
    expect(list).toHaveLength(2);
  });

  test("excludes TV shows", () => {
    insertUser("user-1");
    insertTitle({ id: "m1", tmdbId: 100, type: "movie" });
    insertTitle({ id: "tv1", tmdbId: 200, type: "tv" });
    insertStatus("user-1", "m1", "watchlist");
    insertStatus("user-1", "tv1", "watchlist");

    const list = getRadarrList("user-1");
    expect(list).toEqual([{ Id: 100 }]);
  });

  test("filters by status", () => {
    insertUser("user-1");
    insertTitle({ id: "m1", tmdbId: 100, type: "movie" });
    insertTitle({ id: "m2", tmdbId: 200, type: "movie" });
    insertStatus("user-1", "m1", "watchlist");
    insertStatus("user-1", "m2", "completed");

    expect(getRadarrList("user-1", ["watchlist"])).toEqual([{ Id: 100 }]);
    expect(getRadarrList("user-1", ["completed"])).toEqual([{ Id: 200 }]);
    expect(getRadarrList("user-1", ["watchlist", "completed"])).toHaveLength(2);
  });

  test("returns empty array for user with no movies", () => {
    insertUser("user-1");
    expect(getRadarrList("user-1")).toEqual([]);
  });
});

describe("getSonarrList", () => {
  test("returns TV shows with TVDB IDs", async () => {
    insertUser("user-1");
    insertTitle({
      id: "tv1",
      tmdbId: 300,
      tvdbId: 12345,
      type: "tv",
      title: "Show A",
    });
    insertStatus("user-1", "tv1", "watchlist");

    const list = await getSonarrList("user-1");
    expect(list).toEqual([{ TvdbId: 12345, Title: "Show A" }]);
  });

  test("excludes movies", async () => {
    insertUser("user-1");
    insertTitle({ id: "m1", tmdbId: 100, type: "movie" });
    insertTitle({
      id: "tv1",
      tmdbId: 300,
      tvdbId: 12345,
      type: "tv",
      title: "Show A",
    });
    insertStatus("user-1", "m1", "watchlist");
    insertStatus("user-1", "tv1", "watchlist");

    const list = await getSonarrList("user-1");
    expect(list).toEqual([{ TvdbId: 12345, Title: "Show A" }]);
  });

  test("lazily resolves missing TVDB ID", async () => {
    insertUser("user-1");
    insertTitle({ id: "tv1", tmdbId: 300, type: "tv", title: "Show B" });
    insertStatus("user-1", "tv1", "watchlist");

    mockGetTvExternalIds.mockResolvedValueOnce({
      tvdb_id: 55555,
      imdb_id: "tt1234567",
    });

    const list = await getSonarrList("user-1");
    expect(list).toEqual([{ TvdbId: 55555, Title: "Show B" }]);
    expect(mockGetTvExternalIds).toHaveBeenCalledWith(300);
  });

  test("skips shows where TVDB ID cannot be resolved", async () => {
    insertUser("user-1");
    insertTitle({ id: "tv1", tmdbId: 300, type: "tv", title: "Show C" });
    insertStatus("user-1", "tv1", "watchlist");

    mockGetTvExternalIds.mockResolvedValueOnce({
      tvdb_id: null,
      imdb_id: null,
    });

    const list = await getSonarrList("user-1");
    expect(list).toEqual([]);
  });

  test("filters by status", async () => {
    insertUser("user-1");
    insertTitle({
      id: "tv1",
      tmdbId: 300,
      tvdbId: 111,
      type: "tv",
      title: "Show A",
    });
    insertTitle({
      id: "tv2",
      tmdbId: 400,
      tvdbId: 222,
      type: "tv",
      title: "Show B",
    });
    insertStatus("user-1", "tv1", "watchlist");
    insertStatus("user-1", "tv2", "completed");

    const watchlist = await getSonarrList("user-1", ["watchlist"]);
    expect(watchlist).toEqual([{ TvdbId: 111, Title: "Show A" }]);

    const all = await getSonarrList("user-1", ["watchlist", "completed"]);
    expect(all).toHaveLength(2);
  });
});
