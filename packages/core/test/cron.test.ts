import { beforeEach, describe, expect, test, vi } from "vitest";

import { cronRuns, titles } from "@sofa/db/schema";
import { clearAllTables, eq, insertTitle, testDb } from "@sofa/test/db";

import {
  completeCronRun,
  failCronRun,
  getStaleLibraryTitles,
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
