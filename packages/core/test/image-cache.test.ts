import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { loadImageBuffer } from "../src/image-cache";

beforeEach(() => {
  process.env.IMAGE_CACHE_ENABLED = "false";
});

afterEach(() => {
  delete process.env.IMAGE_CACHE_ENABLED;
});

describe("loadImageBuffer", () => {
  test("uses category-specific TMDB sizes when cache is disabled", async () => {
    const urls: string[] = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((async (
      input: string | URL | Request,
    ) => {
      urls.push(String(input));
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }) as typeof fetch);

    await loadImageBuffer("/poster.jpg", "posters");
    await loadImageBuffer("/profile.jpg", "profiles");

    expect(urls).toEqual([
      "https://image.tmdb.org/t/p/w500/poster.jpg",
      "https://image.tmdb.org/t/p/w185/profile.jpg",
    ]);

    fetchSpy.mockRestore();
  });
});
