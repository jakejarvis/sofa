import { beforeEach, describe, expect, test, vi } from "vitest";

import { cronRuns, seasons, titles } from "@sofa/db/schema";
import { clearAllTables, eq, insertTitle, testDb } from "@sofa/test/db";

import {
  completeCronRun,
  failCronRun,
  getLibraryTitlesDueForRefresh,
  getStaleLibraryTitles,
  getTitleIdsWithStaleSeasons,
  libraryRefreshIntervalMs,
  runIsolated,
  startCronRun,
} from "../src/cron";

beforeEach(() => {
  clearAllTables();
});

describe("startCronRun", () => {
  test("inserts a cron run record", () => {
    const run = startCronRun("metadata-refresh");
    expect(run.id).toBeDefined();
    expect(run.jobName).toBe("metadata-refresh");

    const row = testDb.select().from(cronRuns).where(eq(cronRuns.id, run.id)).get();
    expect(row).toBeDefined();
    expect(row?.status).toBe("running");
  });
});

describe("completeCronRun", () => {
  test("marks a run as successful with duration", () => {
    const run = startCronRun("test-job");
    completeCronRun(run.id, 1500);

    const row = testDb.select().from(cronRuns).where(eq(cronRuns.id, run.id)).get();
    expect(row?.status).toBe("success");
    expect(row?.durationMs).toBe(1500);
  });
});

describe("failCronRun", () => {
  test("marks a run as failed with error message", () => {
    const run = startCronRun("test-job");
    failCronRun(run.id, 500, new Error("Something broke"));

    const row = testDb.select().from(cronRuns).where(eq(cronRuns.id, run.id)).get();
    expect(row?.status).toBe("error");
    expect(row?.durationMs).toBe(500);
    expect(row?.errorMessage).toBe("Something broke");
  });

  test("handles non-Error objects", () => {
    const run = startCronRun("test-job");
    failCronRun(run.id, 100, "string error");

    const row = testDb.select().from(cronRuns).where(eq(cronRuns.id, run.id)).get();
    expect(row?.errorMessage).toBe("string error");
  });
});

describe("runIsolated", () => {
  test("continues after a failing item", async () => {
    const fn = vi.fn<(item: number) => Promise<void>>(async (item) => {
      if (item === 2) throw new Error("boom");
    });
    const onItemError = vi.fn<(item: number, err: unknown) => void>();

    const result = await runIsolated([1, 2, 3], fn, onItemError);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(onItemError).toHaveBeenCalledTimes(1);
    expect(onItemError).toHaveBeenCalledWith(2, expect.any(Error));
    expect(result).toEqual({ attempted: 3, failed: 1 });
  });

  test("throws when every item fails", async () => {
    const onItemError = vi.fn<(item: number, err: unknown) => void>();
    await expect(
      runIsolated(
        [1, 2],
        async () => {
          throw new Error("down");
        },
        onItemError,
      ),
    ).rejects.toThrow("All 2 items failed");
    expect(onItemError).toHaveBeenCalledTimes(2);
  });

  test("resolves for an empty list", async () => {
    const fn = vi.fn<(item: number) => Promise<void>>();
    const result = await runIsolated([], fn, vi.fn<(item: number, err: unknown) => void>());
    expect(result).toEqual({ attempted: 0, failed: 0 });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("getStaleLibraryTitles", () => {
  const staleDate = new Date("2026-01-08T00:00:00Z");

  function setFetched(id: string, date: Date) {
    testDb.update(titles).set({ lastFetchedAt: date }).where(eq(titles.id, id)).run();
  }

  test("returns a shell title with NULL lastFetchedAt", () => {
    insertTitle({ id: "t-shell", tmdbId: 1 });
    expect(getStaleLibraryTitles(["t-shell"], staleDate)).toEqual([{ id: "t-shell" }]);
  });

  test("returns a title fetched before the stale date", () => {
    insertTitle({ id: "t-old", tmdbId: 2 });
    setFetched("t-old", new Date("2026-01-01T00:00:00Z"));
    expect(getStaleLibraryTitles(["t-old"], staleDate)).toEqual([{ id: "t-old" }]);
  });

  test("does not return a title fetched after the stale date", () => {
    insertTitle({ id: "t-fresh", tmdbId: 3 });
    setFetched("t-fresh", new Date("2026-01-09T00:00:00Z"));
    expect(getStaleLibraryTitles(["t-fresh"], staleDate)).toEqual([]);
  });

  test("does not return titles outside the passed id list", () => {
    insertTitle({ id: "t-shell", tmdbId: 1 });
    insertTitle({ id: "t-other", tmdbId: 4 });
    expect(getStaleLibraryTitles(["t-shell"], staleDate)).toEqual([{ id: "t-shell" }]);
  });
});

describe("libraryRefreshIntervalMs", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date("2026-06-01T00:00:00Z");

  test("ended TV shows refresh every 60 days", () => {
    expect(libraryRefreshIntervalMs({ type: "tv", status: "Ended", releaseDate: null }, now)).toBe(
      60 * DAY,
    );
  });

  test("returning TV shows refresh every 7 days", () => {
    expect(
      libraryRefreshIntervalMs({ type: "tv", status: "Returning Series", releaseDate: null }, now),
    ).toBe(7 * DAY);
  });

  test("movies released over a year ago refresh every 60 days", () => {
    expect(
      libraryRefreshIntervalMs(
        { type: "movie", status: "Released", releaseDate: "2001-01-01" },
        now,
      ),
    ).toBe(60 * DAY);
  });

  test("recent movies refresh every 7 days", () => {
    expect(
      libraryRefreshIntervalMs(
        { type: "movie", status: "Released", releaseDate: "2026-05-02" },
        now,
      ),
    ).toBe(7 * DAY);
  });

  test("movies without a release date refresh every 7 days", () => {
    expect(
      libraryRefreshIntervalMs({ type: "movie", status: "Released", releaseDate: null }, now),
    ).toBe(7 * DAY);
  });
});

describe("getLibraryTitlesDueForRefresh", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  test("skips an ended show fetched 10 days ago", () => {
    insertTitle({ id: "t-ended", tmdbId: 1, type: "tv" });
    testDb
      .update(titles)
      .set({ status: "Ended", lastFetchedAt: tenDaysAgo })
      .where(eq(titles.id, "t-ended"))
      .run();
    expect(getLibraryTitlesDueForRefresh(["t-ended"], now)).toEqual([]);
  });

  test("includes a returning show fetched 10 days ago", () => {
    insertTitle({ id: "t-returning", tmdbId: 2, type: "tv" });
    testDb
      .update(titles)
      .set({ status: "Returning Series", lastFetchedAt: tenDaysAgo })
      .where(eq(titles.id, "t-returning"))
      .run();
    expect(getLibraryTitlesDueForRefresh(["t-returning"], now)).toEqual(["t-returning"]);
  });

  test("includes a never-fetched shell title", () => {
    insertTitle({ id: "t-shell", tmdbId: 3 });
    expect(getLibraryTitlesDueForRefresh(["t-shell"], now)).toEqual(["t-shell"]);
  });
});

describe("getTitleIdsWithStaleSeasons", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const cutoff = new Date(now - 7 * DAY);

  function addSeason(id: string, titleId: string, seasonNumber: number, daysAgo: number) {
    testDb
      .insert(seasons)
      .values({ id, titleId, seasonNumber, lastFetchedAt: new Date(now - daysAgo * DAY) })
      .run();
  }

  test("is not stale when the most recent season fetch is fresh", () => {
    insertTitle({ id: "tv-partial", tmdbId: 1, type: "tv" });
    addSeason("s-1", "tv-partial", 1, 30);
    addSeason("s-2", "tv-partial", 2, 1);
    expect(getTitleIdsWithStaleSeasons(["tv-partial"], cutoff).has("tv-partial")).toBe(false);
  });

  test("is stale when every season was fetched long ago", () => {
    insertTitle({ id: "tv-old", tmdbId: 2, type: "tv" });
    addSeason("s-3", "tv-old", 1, 30);
    addSeason("s-4", "tv-old", 2, 30);
    expect(getTitleIdsWithStaleSeasons(["tv-old"], cutoff).has("tv-old")).toBe(true);
  });
});
