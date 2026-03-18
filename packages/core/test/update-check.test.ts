import { describe, expect, test } from "bun:test";

import { isNewerVersion } from "../src/update-check";

describe("isNewerVersion", () => {
  test("newer major version", () => {
    expect(isNewerVersion("2.0.0", "1.0.0")).toBe(true);
  });

  test("older major version", () => {
    expect(isNewerVersion("1.0.0", "2.0.0")).toBe(false);
  });

  test("newer minor version", () => {
    expect(isNewerVersion("1.2.0", "1.1.0")).toBe(true);
  });

  test("older minor version", () => {
    expect(isNewerVersion("1.1.0", "1.2.0")).toBe(false);
  });

  test("newer patch version", () => {
    expect(isNewerVersion("1.0.2", "1.0.1")).toBe(true);
  });

  test("older patch version", () => {
    expect(isNewerVersion("1.0.1", "1.0.2")).toBe(false);
  });

  test("equal versions return false", () => {
    expect(isNewerVersion("1.2.3", "1.2.3")).toBe(false);
  });

  test("handles 'v' prefix on latest", () => {
    expect(isNewerVersion("v2.0.0", "1.0.0")).toBe(true);
  });

  test("handles 'v' prefix on current", () => {
    expect(isNewerVersion("2.0.0", "v1.0.0")).toBe(true);
  });

  test("handles 'v' prefix on both", () => {
    expect(isNewerVersion("v1.0.0", "v1.0.0")).toBe(false);
  });
});
