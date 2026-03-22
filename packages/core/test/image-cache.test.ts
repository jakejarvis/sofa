import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getLocalImagePath, imageCacheEnabled, loadImageBuffer } from "../src/image-cache";

beforeEach(() => {
  process.env.IMAGE_CACHE_ENABLED = "false";
});

afterEach(() => {
  delete process.env.IMAGE_CACHE_ENABLED;
});

function mockFetch(impl: (input: string | URL | Request) => Promise<Response>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(impl as unknown as typeof fetch);
}

// ─── imageCacheEnabled ──────────────────────────────────────────────

describe("imageCacheEnabled", () => {
  test("returns false when IMAGE_CACHE_ENABLED is 'false'", () => {
    process.env.IMAGE_CACHE_ENABLED = "false";
    expect(imageCacheEnabled()).toBe(false);
  });

  test("returns true when IMAGE_CACHE_ENABLED is unset", () => {
    delete process.env.IMAGE_CACHE_ENABLED;
    expect(imageCacheEnabled()).toBe(true);
  });

  test("returns true when IMAGE_CACHE_ENABLED is 'true'", () => {
    process.env.IMAGE_CACHE_ENABLED = "true";
    expect(imageCacheEnabled()).toBe(true);
  });
});

// ─── getLocalImagePath ──────────────────────────────────────────────

describe("getLocalImagePath", () => {
  test("joins cache dir with category and basename", () => {
    const result = getLocalImagePath("posters", "/some/deep/path/poster.jpg");
    expect(result).toContain("posters");
    expect(result).toContain("poster.jpg");
    expect(result).not.toContain("some/deep");
  });
});

// ─── loadImageBuffer ────────────────────────────────────────────────

describe("loadImageBuffer", () => {
  test("uses category-specific TMDB sizes when cache is disabled", async () => {
    const urls: string[] = [];
    mockFetch(async (input) => {
      urls.push(String(input));
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    });

    await loadImageBuffer("/poster.jpg", "posters");
    await loadImageBuffer("/profile.jpg", "profiles");

    expect(urls).toEqual([
      "https://image.tmdb.org/t/p/w500/poster.jpg",
      "https://image.tmdb.org/t/p/w185/profile.jpg",
    ]);
  });

  test("returns null on fetch failure", async () => {
    mockFetch(async () => new Response(null, { status: 404 }));

    const result = await loadImageBuffer("/missing.jpg", "posters");
    expect(result).toBeNull();
  });

  test("returns null on network error", async () => {
    mockFetch(async () => {
      throw new Error("Network error");
    });

    const result = await loadImageBuffer("/fail.jpg", "posters");
    expect(result).toBeNull();
  });

  test("returns buffer on success", async () => {
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockFetch(async () => {
      return new Response(imageBytes, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    });

    const result = await loadImageBuffer("/image.png", "posters");
    expect(result).toBeInstanceOf(Buffer);
    expect(result).toHaveLength(4);
  });

  test("rejects images exceeding size limit via content-length", async () => {
    mockFetch(async () => {
      return new Response(new Uint8Array([1]), {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-length": String(11 * 1024 * 1024),
        },
      });
    });

    const result = await loadImageBuffer("/huge.jpg", "posters");
    expect(result).toBeNull();
  });
});
