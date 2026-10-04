import { describe, expect, test } from "vitest";

import { resolveTmdbBase, tmdbApiUrl } from "@sofa/tmdb/config";

describe("resolveTmdbBase", () => {
  test.each([
    [undefined, "https://api.themoviedb.org", false],
    ["", "https://api.themoviedb.org", false],
    ["https://api.themoviedb.org/3", "https://api.themoviedb.org", false],
    ["https://api.themoviedb.org/3/", "https://api.themoviedb.org", false],
    ["https://proxy.example/3", "https://proxy.example", false],
    ["https://proxy.example/tmdb/3/", "https://proxy.example/tmdb", false],
    ["https://tmdb.internal", "https://tmdb.internal", true],
    ["https://tmdb.internal/", "https://tmdb.internal", true],
    ["https://proxy.example/v3", "https://proxy.example/v3", true],
  ])("resolves %j", (input, baseUrl, stripVersionPrefix) => {
    expect(resolveTmdbBase(input)).toEqual({ baseUrl, stripVersionPrefix });
  });
});

describe("tmdbApiUrl", () => {
  test.each([
    [undefined, "https://api.themoviedb.org/3/configuration"],
    ["", "https://api.themoviedb.org/3/configuration"],
    ["https://proxy.example/3/", "https://proxy.example/3/configuration"],
    ["https://tmdb.internal", "https://tmdb.internal/configuration"],
  ])("builds the URL for %j", (input, expected) => {
    // An explicit undefined would fall back to process.env.TMDB_API_BASE_URL,
    // so use "" (treated as unset) to stay independent of the environment.
    expect(tmdbApiUrl("/configuration", input ?? "")).toBe(expected);
  });
});
