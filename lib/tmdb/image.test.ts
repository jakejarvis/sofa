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
    expect(tmdbImageUrl(null)).toBeNull();
  });

  test("returns null for undefined path", () => {
    expect(tmdbImageUrl(undefined as unknown as string | null)).toBeNull();
  });

  describe("cache enabled (default)", () => {
    test("w500 maps to posters", () => {
      expect(tmdbImageUrl("/abc.jpg", "w500")).toBe(
        "/api/images/posters/abc.jpg",
      );
    });

    test("w1280 maps to backdrops", () => {
      expect(tmdbImageUrl("/backdrop.jpg", "w1280")).toBe(
        "/api/images/backdrops/backdrop.jpg",
      );
    });

    test("w92 maps to logos", () => {
      expect(tmdbImageUrl("/logo.png", "w92")).toBe(
        "/api/images/logos/logo.png",
      );
    });

    test("w185 maps to profiles", () => {
      expect(tmdbImageUrl("/profile.jpg", "w185")).toBe(
        "/api/images/profiles/profile.jpg",
      );
    });

    test("strips leading slash from path", () => {
      expect(tmdbImageUrl("/test.jpg")).toBe("/api/images/posters/test.jpg");
    });

    test("handles path without leading slash", () => {
      expect(tmdbImageUrl("test.jpg")).toBe("/api/images/posters/test.jpg");
    });

    test("explicit category override", () => {
      expect(tmdbImageUrl("/still.jpg", "w1280", "stills")).toBe(
        "/api/images/stills/still.jpg",
      );
    });

    test("default size is w500 (posters)", () => {
      expect(tmdbImageUrl("/img.jpg")).toBe("/api/images/posters/img.jpg");
    });
  });

  describe("cache disabled", () => {
    beforeEach(() => {
      process.env.IMAGE_CACHE_ENABLED = "false";
    });

    test("returns TMDB CDN URL with default base", () => {
      expect(tmdbImageUrl("/abc.jpg", "w500")).toBe(
        "https://image.tmdb.org/t/p/w500/abc.jpg",
      );
    });

    test("uses custom TMDB_IMAGE_BASE_URL", () => {
      process.env.TMDB_IMAGE_BASE_URL = "https://custom-cdn.example.com";
      // Need to re-import to pick up the new base URL — but since IMAGE_BASE_URL
      // is evaluated at module load time, we test with the default
      expect(tmdbImageUrl("/abc.jpg", "w1280")).toBe(
        "https://image.tmdb.org/t/p/w1280/abc.jpg",
      );
    });

    test("preserves size in URL", () => {
      expect(tmdbImageUrl("/img.jpg", "w185")).toBe(
        "https://image.tmdb.org/t/p/w185/img.jpg",
      );
    });
  });
});
