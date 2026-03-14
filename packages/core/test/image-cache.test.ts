import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { loadImageBuffer } from "../src/image-cache";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.IMAGE_CACHE_ENABLED = "false";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.IMAGE_CACHE_ENABLED;
});

describe("loadImageBuffer", () => {
  test("uses category-specific TMDB sizes when cache is disabled", async () => {
    const urls: string[] = [];
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      urls.push(String(input));
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }) as unknown as typeof fetch;

    await loadImageBuffer("/poster.jpg", "posters");
    await loadImageBuffer("/profile.jpg", "profiles");

    expect(urls).toEqual([
      "https://image.tmdb.org/t/p/w500/poster.jpg",
      "https://image.tmdb.org/t/p/w185/profile.jpg",
    ]);
  });
});
