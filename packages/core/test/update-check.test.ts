import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { clearAllTables } from "@sofa/test/db";

import { setSetting } from "../src/settings";
import { isNewerVersion, performUpdateCheck } from "../src/update-check";

const TEST_NOW = new Date("2026-03-01T12:00:00Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TEST_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  clearAllTables();
});

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

describe("performUpdateCheck", () => {
  test("checks again on the next 6-hour run despite last run's latency", async () => {
    const lastChecked = new Date(TEST_NOW.getTime() - (6 * 60 * 60 * 1000 - 30_000));
    setSetting("updateCheckLastCheckedAt", lastChecked.toISOString());

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (async () =>
        new Response(JSON.stringify({ version: "9.9.9", release_url: "https://x" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })) as unknown as typeof fetch,
    );

    const result = await performUpdateCheck();

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    expect(result.latestVersion).toBe("9.9.9");
  });

  test("skips when checked within the last few minutes", async () => {
    setSetting("updateCheckLastCheckedAt", new Date(TEST_NOW.getTime() - 60_000).toISOString());

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await performUpdateCheck();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
