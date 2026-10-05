import { describe, expect, test } from "vitest";

import { clampTotalPages, tmdbSortBy } from "../src/orpc/procedures/discover-utils";

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
