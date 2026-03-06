import { describe, expect, test } from "bun:test";
import { generateProviderUrl } from "./providers";

describe("generateProviderUrl", () => {
  test("generates Netflix URL", () => {
    expect(generateProviderUrl(8, "Inception")).toBe(
      "https://www.netflix.com/search?q=Inception",
    );
  });

  test("generates Amazon Prime Video URL", () => {
    expect(generateProviderUrl(9, "The Matrix")).toBe(
      "https://www.amazon.com/s?i=instant-video&k=The%20Matrix",
    );
  });

  test("generates Disney+ URL", () => {
    expect(generateProviderUrl(337, "Frozen")).toBe(
      "https://www.disneyplus.com/search/Frozen",
    );
  });

  test("URL-encodes spaces", () => {
    expect(generateProviderUrl(8, "The Dark Knight")).toBe(
      "https://www.netflix.com/search?q=The%20Dark%20Knight",
    );
  });

  test("URL-encodes special characters", () => {
    expect(generateProviderUrl(8, "Tom & Jerry")).toBe(
      "https://www.netflix.com/search?q=Tom%20%26%20Jerry",
    );
  });

  test("URL-encodes unicode", () => {
    const url = generateProviderUrl(8, "Amelie");
    expect(url).toContain("Amelie");
    expect(url).not.toBeNull();
  });

  test("returns null for unknown provider ID", () => {
    expect(generateProviderUrl(99999, "Test")).toBeNull();
  });

  test("generates Hulu URL", () => {
    expect(generateProviderUrl(15, "Test")).toBe(
      "https://www.hulu.com/search?q=Test",
    );
  });
});
