import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { tmdbImageUrl } from "./image";

describe("tmdbImageUrl", () => {
  const origCacheEnabled = process.env.IMAGE_CACHE_ENABLED;
  const origBaseUrl = process.env.TMDB_IMAGE_BASE_URL;

  beforeEach(() => {
    delete process.env.IMAGE_CACHE_ENABLED;
    delete process.env.TMDB_IMAGE_BASE_URL;
  });

  afterEach(() => {
    if (origCacheEnabled !== undefined) {
      process.env.IMAGE_CACHE_ENABLED = origCacheEnabled;
    } else {
      delete process.env.IMAGE_CACHE_ENABLED;
    }
    if (origBaseUrl !== undefined) {
      process.env.TMDB_IMAGE_BASE_URL = origBaseUrl;
    } else {
      delete process.env.TMDB_IMAGE_BASE_URL;
    }
  });

  test("returns null for null path", () => {
    expect(tmdbImageUrl(null, "posters")).toBeNull();
  });

  test("returns null for undefined path", () => {
    expect(
      tmdbImageUrl(undefined as unknown as string | null, "posters"),
    ).toBeNull();
  });

  describe("cache enabled (default)", () => {
    test("posters category", () => {
      expect(tmdbImageUrl("/abc.jpg", "posters")).toBe(
        "/api/images/posters/abc.jpg",
      );
    });

    test("backdrops category", () => {
      expect(tmdbImageUrl("/backdrop.jpg", "backdrops")).toBe(
        "/api/images/backdrops/backdrop.jpg",
      );
    });

    test("logos category", () => {
      expect(tmdbImageUrl("/logo.png", "logos")).toBe(
        "/api/images/logos/logo.png",
      );
    });

    test("profiles category", () => {
      expect(tmdbImageUrl("/profile.jpg", "profiles")).toBe(
        "/api/images/profiles/profile.jpg",
      );
    });

    test("stills category", () => {
      expect(tmdbImageUrl("/still.jpg", "stills")).toBe(
        "/api/images/stills/still.jpg",
      );
    });

    test("strips leading slash from path", () => {
      expect(tmdbImageUrl("/test.jpg", "posters")).toBe(
        "/api/images/posters/test.jpg",
      );
    });

    test("handles path without leading slash", () => {
      expect(tmdbImageUrl("test.jpg", "posters")).toBe(
        "/api/images/posters/test.jpg",
      );
    });
  });

  describe("cache disabled", () => {
    beforeEach(() => {
      process.env.IMAGE_CACHE_ENABLED = "false";
    });

    test("returns TMDB CDN URL with default size for category", () => {
      expect(tmdbImageUrl("/abc.jpg", "posters")).toBe(
        "https://image.tmdb.org/t/p/w500/abc.jpg",
      );
    });

    test("uses category-specific size", () => {
      expect(tmdbImageUrl("/abc.jpg", "backdrops")).toBe(
        "https://image.tmdb.org/t/p/w1280/abc.jpg",
      );
    });

    test("allows size override", () => {
      expect(tmdbImageUrl("/abc.jpg", "posters", "w300")).toBe(
        "https://image.tmdb.org/t/p/w300/abc.jpg",
      );
    });

    test("preserves size for profiles", () => {
      expect(tmdbImageUrl("/img.jpg", "profiles")).toBe(
        "https://image.tmdb.org/t/p/w185/img.jpg",
      );
    });

    test("preserves size for logos", () => {
      expect(tmdbImageUrl("/img.jpg", "logos")).toBe(
        "https://image.tmdb.org/t/p/w92/img.jpg",
      );
    });
  });
});
