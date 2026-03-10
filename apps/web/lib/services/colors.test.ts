import { describe, expect, mock, test } from "bun:test";

mock.module("@/lib/services/image-cache", () => ({
  downloadAndCacheImage: async () => {},
  getLocalImagePath: () => "",
  imageCacheEnabled: () => false,
  isImageCached: async () => false,
}));

import { parseColorPalette } from "./colors";

describe("parseColorPalette", () => {
  test("returns null for null input", () => {
    expect(parseColorPalette(null)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseColorPalette("")).toBeNull();
  });

  test("parses valid JSON", () => {
    const palette = {
      vibrant: "#e63946",
      darkVibrant: "#1d3557",
      lightVibrant: "#f1faee",
      muted: "#a8dadc",
      darkMuted: "#457b9d",
      lightMuted: "#f4f4f4",
    };
    expect(parseColorPalette(JSON.stringify(palette))).toEqual(palette);
  });

  test("returns null for malformed JSON", () => {
    expect(parseColorPalette("{not valid json")).toBeNull();
  });
});
