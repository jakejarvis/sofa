import { call } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { auth } from "@sofa/auth/server";
import { clearAllTables, insertUser } from "@sofa/test/db";
import { isTmdbConfigured } from "@sofa/tmdb/config";

import { implementedRouter } from "../src/orpc/router";

vi.mock("@sofa/auth/server", () => ({
  auth: {
    api: { getSession: vi.fn<() => void>(), updateUser: vi.fn<() => void>() },
    handler: vi.fn<() => void>(),
  },
}));

vi.mock("@sofa/tmdb/config", () => ({
  isTmdbConfigured: vi.fn<() => boolean>(() => true),
}));

type AnyFn = (...args: unknown[]) => Promise<unknown>;

const tmdb = vi.hoisted(() => ({
  getTrending: vi.fn<AnyFn>(),
  getPopular: vi.fn<AnyFn>(),
  searchMulti: vi.fn<AnyFn>(),
  searchMovies: vi.fn<AnyFn>(),
  searchTv: vi.fn<AnyFn>(),
  searchPerson: vi.fn<AnyFn>(),
  discover: vi.fn<AnyFn>(),
  getGenres: vi.fn<AnyFn>(),
  findByExternalId: vi.fn<AnyFn>(),
}));

vi.mock("@sofa/tmdb/client", () => tmdb);

const getSession = vi.mocked(auth.api.getSession);
const ctx = { context: { headers: new Headers() } };

function sessionFor(userId: string, role: "user" | "admin" = "user") {
  return {
    session: { id: `session-${userId}`, userId },
    user: { id: userId, role, name: "U", email: `${userId}@example.com` },
  } as never;
}

const movie = {
  id: 603,
  media_type: "movie",
  title: "The Matrix",
  overview: "A hacker learns the truth.",
  poster_path: "/matrix.jpg",
  backdrop_path: "/matrix-bg.jpg",
  release_date: "1999-03-31",
  vote_average: 8.2,
};

const show = {
  id: 1399,
  media_type: "tv",
  name: "Game of Thrones",
  overview: "Noble families vie for the throne.",
  poster_path: "/got.jpg",
  backdrop_path: null,
  first_air_date: "2011-04-17",
  vote_average: 8.4,
};

const noPoster = {
  id: 999,
  media_type: "movie",
  title: "No Poster",
  poster_path: null,
  backdrop_path: "/nope-bg.jpg",
  release_date: "2020-01-01",
  vote_average: 5,
};

const person = {
  id: 6384,
  media_type: "person",
  name: "Keanu Reeves",
  profile_path: "/keanu.jpg",
  popularity: 50.5,
};

beforeEach(() => {
  clearAllTables();
  insertUser("user-1");
  for (const fn of Object.values(tmdb)) fn.mockReset();
  vi.mocked(isTmdbConfigured).mockReturnValue(true);
  getSession.mockResolvedValue(sessionFor("user-1"));
});

describe("discover.trending", () => {
  test("maps results with posters, builds the hero, and returns user state", async () => {
    tmdb.getTrending.mockResolvedValue({
      page: 1,
      total_pages: 7,
      total_results: 140,
      results: [movie, show, noPoster],
    });

    const result = await call(implementedRouter.discover.trending, { type: "all", page: 1 }, ctx);

    expect(tmdb.getTrending).toHaveBeenCalledWith("all", "day", 1);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      tmdbId: 603,
      type: "movie",
      title: "The Matrix",
      releaseDate: "1999-03-31",
      firstAirDate: null,
      voteAverage: 8.2,
    });
    expect(result.items[0]?.posterPath).toBe("/images/posters/matrix.jpg");
    expect(result.items[0]?.id).toBeTruthy();
    expect(result.items[1]).toMatchObject({
      tmdbId: 1399,
      type: "tv",
      title: "Game of Thrones",
      releaseDate: null,
      firstAirDate: "2011-04-17",
    });
    expect(result.items[1]?.posterPath).toBe("/images/posters/got.jpg");
    expect(result.items[1]?.id).toBeTruthy();
    expect(result.hero).toMatchObject({
      tmdbId: 603,
      type: "movie",
      title: "The Matrix",
      overview: "A hacker learns the truth.",
      backdropPath: "/images/backdrops/matrix-bg.jpg",
      voteAverage: 8.2,
    });
    expect(result.hero?.id).toBe(result.items[0]?.id);
    expect(typeof result.userStatuses).toBe("object");
    expect(typeof result.episodeProgress).toBe("object");
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(7);
    expect(result.totalResults).toBe(140);
  });

  test("returns empty collections when TMDB has no results", async () => {
    tmdb.getTrending.mockResolvedValue({ page: 1, total_pages: 1, total_results: 0, results: [] });

    const result = await call(implementedRouter.discover.trending, { type: "all", page: 1 }, ctx);

    expect(result.items).toEqual([]);
    expect(result.hero).toBeNull();
    expect(result.userStatuses).toEqual({});
    expect(result.episodeProgress).toEqual({});
  });

  test("clamps total pages to 500", async () => {
    tmdb.getTrending.mockResolvedValue({
      page: 1,
      total_pages: 1234,
      total_results: 24680,
      results: [movie],
    });

    const result = await call(implementedRouter.discover.trending, { type: "all", page: 1 }, ctx);

    expect(result.totalPages).toBe(500);
  });

  test("rejects when TMDB is not configured", async () => {
    vi.mocked(isTmdbConfigured).mockReturnValueOnce(false);

    await expect(
      call(implementedRouter.discover.trending, { type: "all", page: 1 }, ctx),
    ).rejects.toMatchObject({ data: { code: "TMDB_NOT_CONFIGURED" } });
    expect(tmdb.getTrending).not.toHaveBeenCalled();
  });
});

describe("discover.popular", () => {
  test("types every item with the requested media type", async () => {
    tmdb.getPopular.mockResolvedValue({
      page: 2,
      total_pages: 10,
      total_results: 200,
      results: [show],
    });

    const result = await call(implementedRouter.discover.popular, { type: "tv", page: 2 }, ctx);

    expect(tmdb.getPopular).toHaveBeenCalledWith("tv", 2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ tmdbId: 1399, type: "tv", title: "Game of Thrones" });
    expect(result.items[0]?.id).toBeTruthy();
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(10);
  });
});

describe("discover.search", () => {
  test("returns the empty result for a blank query", async () => {
    const result = await call(implementedRouter.discover.search, { query: "  ", page: 1 }, ctx);

    expect(result).toEqual({ results: [], page: 1, totalPages: 0, totalResults: 0 });
    expect(tmdb.searchMulti).not.toHaveBeenCalled();
  });

  test("maps movies, TV shows, and people from multi search", async () => {
    tmdb.searchMulti.mockResolvedValue({
      page: 1,
      total_pages: 3,
      total_results: 50,
      results: [movie, show, person],
    });

    const result = await call(implementedRouter.discover.search, { query: "x", page: 1 }, ctx);

    expect(tmdb.searchMulti).toHaveBeenCalledWith("x", 1);
    expect(result.results).toHaveLength(3);
    expect(result.results[0]).toMatchObject({
      tmdbId: 603,
      type: "movie",
      title: "The Matrix",
      releaseDate: "1999-03-31",
      posterPath: "/images/posters/matrix.jpg",
    });
    expect(result.results[0]?.id).toBeTruthy();
    expect(result.results[1]).toMatchObject({
      tmdbId: 1399,
      type: "tv",
      title: "Game of Thrones",
      releaseDate: "2011-04-17",
    });
    expect(result.results[1]?.id).toBeTruthy();
    expect(result.results[2]).toMatchObject({
      tmdbId: 6384,
      type: "person",
      title: "Keanu Reeves",
      profilePath: "/images/profiles/keanu.jpg",
      posterPath: null,
    });
    expect(result.results[2]?.id).toBeTruthy();
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.totalResults).toBe(50);
  });

  test("person search uses searchPerson and keeps at most 3 known-for titles", async () => {
    tmdb.searchPerson.mockResolvedValue({
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [
        {
          id: 6384,
          name: "Keanu Reeves",
          profile_path: "/keanu.jpg",
          popularity: 50.5,
          known_for_department: "Acting",
          known_for: [
            { id: 1, title: "The Matrix" },
            { id: 2, title: "John Wick" },
            { id: 3, name: "Some Show" },
            { id: 4, title: "Speed" },
          ],
        },
      ],
    });

    const result = await call(
      implementedRouter.discover.search,
      { query: "keanu", type: "person", page: 1 },
      ctx,
    );

    expect(tmdb.searchPerson).toHaveBeenCalledWith("keanu", 1);
    expect(tmdb.searchMulti).not.toHaveBeenCalled();
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      tmdbId: 6384,
      type: "person",
      title: "Keanu Reeves",
      knownForDepartment: "Acting",
      knownFor: ["The Matrix", "John Wick", "Some Show"],
      profilePath: "/images/profiles/keanu.jpg",
    });
    expect(result.results[0]?.id).toBeTruthy();
  });
});

describe("discover.browse", () => {
  const empty = { page: 1, total_pages: 1, total_results: 0, results: [] };

  test("builds movie discover params from the filters", async () => {
    tmdb.discover.mockResolvedValue({ ...empty, results: [movie] });

    const result = await call(
      implementedRouter.discover.browse,
      { type: "movie", page: 1, yearMin: 1990, yearMax: 1999, genreId: 28, ratingMin: 7 },
      ctx,
    );

    expect(tmdb.discover).toHaveBeenCalledWith(
      "movie",
      expect.objectContaining({
        "primary_release_date.gte": "1990-01-01",
        "primary_release_date.lte": "1999-12-31",
        with_genres: "28",
        "vote_average.gte": "7",
        "vote_count.gte": "50",
        sort_by: "popularity.desc",
      }),
      1,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ tmdbId: 603, type: "movie" });
  });

  test("maps TV date sorts and year bounds to first_air_date", async () => {
    tmdb.discover.mockResolvedValue(empty);

    await call(
      implementedRouter.discover.browse,
      { type: "tv", page: 1, sortBy: "primary_release_date.desc", yearMin: 2000 },
      ctx,
    );

    expect(tmdb.discover).toHaveBeenCalledWith(
      "tv",
      expect.objectContaining({
        sort_by: "first_air_date.desc",
        "first_air_date.gte": "2000-01-01",
      }),
      1,
    );
  });
});

describe("search by IMDb ID", () => {
  const found = { movie_results: [movie], tv_results: [show] };

  test("resolves an IMDb ID through the find endpoint instead of text search", async () => {
    tmdb.findByExternalId.mockResolvedValue(found);

    const result = await call(
      implementedRouter.discover.search,
      { query: "tt0133093", page: 1 },
      ctx,
    );

    expect(tmdb.findByExternalId).toHaveBeenCalledWith("tt0133093", "imdb_id");
    expect(tmdb.searchMulti).not.toHaveBeenCalled();
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({ tmdbId: 603, type: "movie", title: "The Matrix" });
    expect(result.results[0]?.id).toBeTruthy();
    expect(result.results[1]).toMatchObject({
      tmdbId: 1399,
      type: "tv",
      title: "Game of Thrones",
    });
    expect(result.results[1]?.id).toBeTruthy();
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.totalResults).toBe(2);
  });

  test("lowercases the IMDb ID", async () => {
    tmdb.findByExternalId.mockResolvedValue(found);

    await call(implementedRouter.discover.search, { query: "TT0133093", page: 1 }, ctx);

    expect(tmdb.findByExternalId).toHaveBeenCalledWith("tt0133093", "imdb_id");
  });

  test("respects the type filter", async () => {
    tmdb.findByExternalId.mockResolvedValue(found);

    const result = await call(
      implementedRouter.discover.search,
      { query: "tt0133093", type: "movie", page: 1 },
      ctx,
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ tmdbId: 603, type: "movie" });
  });

  test("returns no pages when the ID matches nothing", async () => {
    tmdb.findByExternalId.mockResolvedValue({ movie_results: [], tv_results: [] });

    const result = await call(
      implementedRouter.discover.search,
      { query: "tt0133093", page: 1 },
      ctx,
    );

    expect(result.results).toEqual([]);
    expect(result.totalPages).toBe(0);
    expect(result.totalResults).toBe(0);
  });

  test("treats a too-short ID as a regular text query", async () => {
    tmdb.searchMulti.mockResolvedValue({ page: 1, total_pages: 1, total_results: 0, results: [] });

    await call(implementedRouter.discover.search, { query: "tt123", page: 1 }, ctx);

    expect(tmdb.searchMulti).toHaveBeenCalledWith("tt123", 1);
    expect(tmdb.findByExternalId).not.toHaveBeenCalled();
  });

  test("person searches never use the find endpoint", async () => {
    tmdb.searchPerson.mockResolvedValue({
      page: 1,
      total_pages: 1,
      total_results: 0,
      results: [],
    });

    await call(
      implementedRouter.discover.search,
      { query: "tt0133093", type: "person", page: 1 },
      ctx,
    );

    expect(tmdb.searchPerson).toHaveBeenCalledWith("tt0133093", 1);
    expect(tmdb.findByExternalId).not.toHaveBeenCalled();
  });
});
