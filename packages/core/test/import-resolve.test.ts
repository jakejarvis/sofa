import { afterEach, describe, expect, spyOn, test } from "bun:test";

import * as tmdbClient from "@sofa/tmdb/client";

import { resolveMovieTmdbId, resolveShowTmdbId } from "../src/imports/resolve";

// The TMDB client functions (findByExternalId, searchMovies, searchTv) are
// called by the resolve functions. We spy on them directly rather than on
// globalThis.fetch because openapi-fetch captures the fetch reference at
// module-init time, making globalThis.fetch mocking ineffective.

let findSpy: ReturnType<typeof spyOn>;
let searchMoviesSpy: ReturnType<typeof spyOn>;
let searchTvSpy: ReturnType<typeof spyOn>;

afterEach(() => {
  findSpy?.mockRestore();
  searchMoviesSpy?.mockRestore();
  searchTvSpy?.mockRestore();
});

// ── resolveMovieTmdbId ──────────────────────────────────────────────

describe("resolveMovieTmdbId", () => {
  test("returns tmdbId directly when provided", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId");
    searchMoviesSpy = spyOn(tmdbClient, "searchMovies");

    const result = await resolveMovieTmdbId({ tmdbId: 123 });
    expect(result).toBe(123);
    expect(findSpy).not.toHaveBeenCalled();
    expect(searchMoviesSpy).not.toHaveBeenCalled();
  });

  test("resolves via IMDB ID lookup", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [{ id: 456 }],
      tv_results: [],
      tv_episode_results: [],
    } as never);

    const result = await resolveMovieTmdbId({ imdbId: "tt1234567" });
    expect(result).toBe(456);
    expect(findSpy).toHaveBeenCalledWith("tt1234567", "imdb_id");
  });

  test("falls back to TVDB lookup when no IMDB ID", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [{ id: 789 }],
      tv_results: [],
      tv_episode_results: [],
    } as never);

    const result = await resolveMovieTmdbId({ tvdbId: 99887 });
    expect(result).toBe(789);
    expect(findSpy).toHaveBeenCalledWith("99887", "tvdb_id");
  });

  test("IMDB returns no movie, falls back to TVDB", async () => {
    let callIndex = 0;
    findSpy = spyOn(tmdbClient, "findByExternalId").mockImplementation(async () => {
      callIndex++;
      if (callIndex === 1) {
        // IMDB lookup — no results
        return {
          movie_results: [],
          tv_results: [],
          tv_episode_results: [],
        } as never;
      }
      // TVDB lookup — has result
      return {
        movie_results: [{ id: 789 }],
        tv_results: [],
        tv_episode_results: [],
      } as never;
    });

    const result = await resolveMovieTmdbId({
      imdbId: "tt0000001",
      tvdbId: 99887,
    });
    expect(result).toBe(789);
    expect(findSpy).toHaveBeenCalledTimes(2);
  });

  test("falls back to title search when no IDs available", async () => {
    searchMoviesSpy = spyOn(tmdbClient, "searchMovies").mockResolvedValue({
      results: [{ id: 321, title: "Inception", release_date: "2010-07-16" }],
    } as never);

    const result = await resolveMovieTmdbId({ title: "Inception" });
    expect(result).toBe(321);
    expect(searchMoviesSpy).toHaveBeenCalledWith("Inception");
  });

  test("title search with year prefers matching year", async () => {
    searchMoviesSpy = spyOn(tmdbClient, "searchMovies").mockResolvedValue({
      results: [
        { id: 100, title: "Dune", release_date: "1984-12-14" },
        { id: 200, title: "Dune", release_date: "2021-10-22" },
      ],
    } as never);

    const result = await resolveMovieTmdbId({ title: "Dune", year: 2021 });
    expect(result).toBe(200);
  });

  test("title search without year match returns null", async () => {
    searchMoviesSpy = spyOn(tmdbClient, "searchMovies").mockResolvedValue({
      results: [
        { id: 100, title: "Dune", release_date: "1984-12-14" },
        { id: 200, title: "Dune", release_date: "2021-10-22" },
      ],
    } as never);

    // year=1999 doesn't match any result — don't fall back to an arbitrary result
    const result = await resolveMovieTmdbId({ title: "Dune", year: 1999 });
    expect(result).toBeNull();
  });

  test("returns null when all methods fail", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [],
      tv_results: [],
      tv_episode_results: [],
    } as never);
    searchMoviesSpy = spyOn(tmdbClient, "searchMovies").mockResolvedValue({
      results: [],
    } as never);

    const result = await resolveMovieTmdbId({
      imdbId: "tt0000000",
      title: "NonexistentFilm",
    });
    expect(result).toBeNull();
  });

  test("returns null when no identifiers at all", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId");
    searchMoviesSpy = spyOn(tmdbClient, "searchMovies");

    const result = await resolveMovieTmdbId({});
    expect(result).toBeNull();
    expect(findSpy).not.toHaveBeenCalled();
    expect(searchMoviesSpy).not.toHaveBeenCalled();
  });

  test("cache prevents duplicate lookups", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [{ id: 555 }],
      tv_results: [],
      tv_episode_results: [],
    } as never);

    const cache = new Map<string, number | null>();

    const first = await resolveMovieTmdbId({ imdbId: "tt9999999" }, cache);
    expect(first).toBe(555);
    expect(findSpy).toHaveBeenCalledTimes(1);

    const second = await resolveMovieTmdbId({ imdbId: "tt9999999" }, cache);
    expect(second).toBe(555);
    // No additional calls — cache hit
    expect(findSpy).toHaveBeenCalledTimes(1);
  });

  test("cache stores null for unresolvable items", async () => {
    searchMoviesSpy = spyOn(tmdbClient, "searchMovies").mockResolvedValue({
      results: [],
    } as never);

    const cache = new Map<string, number | null>();

    const first = await resolveMovieTmdbId({ title: "Nothing" }, cache);
    expect(first).toBeNull();

    // Cache should contain a null entry
    expect(cache.size).toBe(1);
    const cachedValue = [...cache.values()][0];
    expect(cachedValue).toBeNull();
  });
});

// ── resolveShowTmdbId ───────────────────────────────────────────────

describe("resolveShowTmdbId", () => {
  test("returns tmdbId directly when provided", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId");

    const result = await resolveShowTmdbId({ tmdbId: 42 });
    expect(result).toBe(42);
    expect(findSpy).not.toHaveBeenCalled();
  });

  test("resolves via IMDB ID — show-level result", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [],
      tv_results: [{ id: 600, name: "Breaking Bad" }],
      tv_episode_results: [],
    } as never);

    const result = await resolveShowTmdbId({ imdbId: "tt5555555" });
    expect(result).toBe(600);
  });

  test("resolves via IMDB ID — episode-level result extracts show_id", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [],
      tv_results: [],
      tv_episode_results: [
        {
          id: 9001,
          episode_number: 3,
          name: "Fly",
          season_number: 3,
          show_id: 700,
        },
      ],
    } as never);

    const result = await resolveShowTmdbId({ imdbId: "tt7777777" });
    expect(result).toBe(700);
  });

  test("falls back to TVDB lookup", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [],
      tv_results: [{ id: 800 }],
      tv_episode_results: [],
    } as never);

    const result = await resolveShowTmdbId({ tvdbId: 12345 });
    expect(result).toBe(800);
    expect(findSpy).toHaveBeenCalledWith("12345", "tvdb_id");
  });

  test("TVDB lookup extracts show_id from episode result", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [],
      tv_results: [],
      tv_episode_results: [
        {
          id: 1,
          episode_number: 1,
          name: "Pilot",
          season_number: 1,
          show_id: 850,
        },
      ],
    } as never);

    const result = await resolveShowTmdbId({ tvdbId: 54321 });
    expect(result).toBe(850);
  });

  test("falls back to title search", async () => {
    searchTvSpy = spyOn(tmdbClient, "searchTv").mockResolvedValue({
      results: [{ id: 900, name: "The Office" }],
    } as never);

    const result = await resolveShowTmdbId({ title: "The Office" });
    expect(result).toBe(900);
    expect(searchTvSpy).toHaveBeenCalledWith("The Office");
  });

  test("returns null when all methods fail", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [],
      tv_results: [],
      tv_episode_results: [],
    } as never);
    searchTvSpy = spyOn(tmdbClient, "searchTv").mockResolvedValue({
      results: [],
    } as never);

    const result = await resolveShowTmdbId({
      imdbId: "tt0000000",
      title: "Nothing",
    });
    expect(result).toBeNull();
  });

  test("cache prevents duplicate show lookups", async () => {
    findSpy = spyOn(tmdbClient, "findByExternalId").mockResolvedValue({
      movie_results: [],
      tv_results: [{ id: 950 }],
      tv_episode_results: [],
    } as never);

    const cache = new Map<string, number | null>();

    const first = await resolveShowTmdbId({ imdbId: "tt8888888" }, cache);
    expect(first).toBe(950);
    expect(findSpy).toHaveBeenCalledTimes(1);

    const second = await resolveShowTmdbId({ imdbId: "tt8888888" }, cache);
    expect(second).toBe(950);
    expect(findSpy).toHaveBeenCalledTimes(1);
  });
});
