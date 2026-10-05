import { describe, expect, test } from "vitest";

import { buildDiscoverParams, clampTotalPages, tmdbSortBy, toBrowseItem } from "../src/browse";

describe("clampTotalPages", () => {
  test("defaults to 1 when undefined", () => {
    expect(clampTotalPages(undefined)).toBe(1);
  });

  test("passes through values under the cap", () => {
    expect(clampTotalPages(42)).toBe(42);
  });

  test("caps at 500", () => {
    expect(clampTotalPages(1234)).toBe(500);
  });
});

describe("tmdbSortBy", () => {
  test("maps TV date sorts to first_air_date", () => {
    expect(tmdbSortBy("tv", "primary_release_date.desc")).toBe("first_air_date.desc");
    expect(tmdbSortBy("tv", "primary_release_date.asc")).toBe("first_air_date.asc");
  });

  test("leaves movie date sorts unchanged", () => {
    expect(tmdbSortBy("movie", "primary_release_date.desc")).toBe("primary_release_date.desc");
  });

  test("defaults to popularity.desc", () => {
    expect(tmdbSortBy("tv", undefined)).toBe("popularity.desc");
  });

  test("leaves other TV sorts unchanged", () => {
    expect(tmdbSortBy("tv", "vote_average.desc")).toBe("vote_average.desc");
  });
});

describe("toBrowseItem", () => {
  test("uses title for movies", () => {
    expect(
      toBrowseItem(
        {
          id: 603,
          title: "The Matrix",
          poster_path: "/matrix.jpg",
          release_date: "1999-03-31",
          vote_average: 8.2,
        },
        "movie",
      ),
    ).toEqual({
      tmdbId: 603,
      type: "movie",
      title: "The Matrix",
      posterPath: "/matrix.jpg",
      releaseDate: "1999-03-31",
      firstAirDate: null,
      voteAverage: 8.2,
    });
  });

  test("falls back to name for TV shows", () => {
    expect(
      toBrowseItem({ id: 1399, name: "Game of Thrones", first_air_date: "2011-04-17" }, "tv"),
    ).toMatchObject({
      tmdbId: 1399,
      type: "tv",
      title: "Game of Thrones",
      releaseDate: null,
      firstAirDate: "2011-04-17",
    });
  });

  test("maps missing poster, dates, and rating to null and a missing title to empty", () => {
    expect(toBrowseItem({ id: 1, poster_path: null }, "movie")).toEqual({
      tmdbId: 1,
      type: "movie",
      title: "",
      posterPath: null,
      releaseDate: null,
      firstAirDate: null,
      voteAverage: null,
    });
  });

  test("uses the type it is given, not the result's media_type", () => {
    expect(toBrowseItem({ id: 2, media_type: "tv", name: "X" }, "movie").type).toBe("movie");
  });
});

describe("buildDiscoverParams", () => {
  test("defaults to popularity sort with a minimum vote count", () => {
    expect(buildDiscoverParams({ type: "movie", page: 1 }, [], "US")).toEqual({
      sort_by: "popularity.desc",
      "vote_count.gte": "50",
    });
  });

  test("uses primary_release_date bounds for movies", () => {
    const params = buildDiscoverParams(
      { type: "movie", page: 1, yearMin: 1990, yearMax: 1999, genreId: 28, ratingMin: 7 },
      [],
      "US",
    );
    expect(params).toMatchObject({
      "primary_release_date.gte": "1990-01-01",
      "primary_release_date.lte": "1999-12-31",
      with_genres: "28",
      "vote_average.gte": "7",
    });
    expect(params).not.toHaveProperty("first_air_date.gte");
  });

  test("uses first_air_date bounds and mapped sort for TV", () => {
    const params = buildDiscoverParams(
      {
        type: "tv",
        page: 1,
        sortBy: "primary_release_date.asc",
        yearMin: 2000,
        yearMax: 2010,
        language: "ko",
      },
      [],
      "US",
    );
    expect(params).toMatchObject({
      sort_by: "first_air_date.asc",
      "first_air_date.gte": "2000-01-01",
      "first_air_date.lte": "2010-12-31",
      with_original_language: "ko",
    });
    expect(params).not.toHaveProperty("primary_release_date.gte");
  });

  test("keeps a rating minimum of 0", () => {
    expect(buildDiscoverParams({ type: "movie", page: 1, ratingMin: 0 }, [], "US")).toMatchObject({
      "vote_average.gte": "0",
    });
  });

  test("adds watch provider filters when the platform has TMDB ids", () => {
    expect(buildDiscoverParams({ type: "movie", page: 1 }, [8, 337, 15], "GB")).toMatchObject({
      with_watch_providers: "8|337|15",
      watch_region: "GB",
    });
  });

  test("omits watch provider filters when the id list is empty", () => {
    const params = buildDiscoverParams({ type: "movie", page: 1 }, [], "GB");
    expect(params).not.toHaveProperty("with_watch_providers");
    expect(params).not.toHaveProperty("watch_region");
  });
});
