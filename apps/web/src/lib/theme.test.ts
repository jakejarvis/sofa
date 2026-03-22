import { describe, expect, test } from "vitest";

import { getThemeCssProperties, hexToRelativeLuminance } from "./theme";

describe("hexToRelativeLuminance", () => {
  test("black has luminance ~0", () => {
    expect(hexToRelativeLuminance("#000000")).toBeCloseTo(0, 4);
  });

  test("white has luminance ~1", () => {
    expect(hexToRelativeLuminance("#ffffff")).toBeCloseTo(1, 4);
  });

  test("mid-range grey", () => {
    const lum = hexToRelativeLuminance("#808080");
    expect(lum).toBeGreaterThan(0.15);
    expect(lum).toBeLessThan(0.25);
  });

  test("pure red", () => {
    const lum = hexToRelativeLuminance("#ff0000");
    expect(lum).toBeCloseTo(0.2126, 3);
  });

  test("pure green", () => {
    const lum = hexToRelativeLuminance("#00ff00");
    expect(lum).toBeCloseTo(0.7152, 3);
  });

  test("pure blue", () => {
    const lum = hexToRelativeLuminance("#0000ff");
    expect(lum).toBeCloseTo(0.0722, 3);
  });
});

describe("getTitleThemeStyle", () => {
  test("returns empty object for null palette", () => {
    expect(getThemeCssProperties(null)).toEqual({});
  });

  test("returns empty object when vibrant is null", () => {
    expect(
      getThemeCssProperties({
        vibrant: null,
        darkVibrant: "#123456",
        lightVibrant: null,
        muted: null,
        darkMuted: null,
        lightMuted: null,
      }),
    ).toEqual({});
  });

  test("dark color produces light foreground", () => {
    const style = getThemeCssProperties({
      vibrant: "#1a1a2e",
      darkVibrant: null,
      lightVibrant: null,
      muted: null,
      darkMuted: null,
      lightMuted: null,
    });
    expect(style["--primary" as keyof typeof style]).toBe("#1a1a2e");
    expect(style["--primary-foreground" as keyof typeof style]).toBe("oklch(0.93 0.015 80)");
  });

  test("bright color produces dark foreground", () => {
    const style = getThemeCssProperties({
      vibrant: "#ffff00",
      darkVibrant: null,
      lightVibrant: null,
      muted: null,
      darkMuted: null,
      lightMuted: null,
    });
    expect(style["--primary" as keyof typeof style]).toBe("#ffff00");
    expect(style["--primary-foreground" as keyof typeof style]).toBe("oklch(0.13 0.006 55)");
  });

  test("sets all expected CSS custom properties", () => {
    const style = getThemeCssProperties({
      vibrant: "#e63946",
      darkVibrant: null,
      lightVibrant: null,
      muted: null,
      darkMuted: null,
      lightMuted: null,
    });
    expect(style).toHaveProperty("--primary");
    expect(style).toHaveProperty("--ring");
    expect(style).toHaveProperty("--primary-foreground");
    expect(style).toHaveProperty("--status-watching");
    expect(style["--ring" as keyof typeof style]).toBe("#e63946");
    expect(style["--status-watching" as keyof typeof style]).toBe("#e63946");
  });
});
