import { describe, expect, test, vi } from "vitest";

import type { NormalizedImport } from "@sofa/api/schemas";

import { runImportJob } from "./import-job";
import type { ImportJobApi, ImportOptions, ImportProgress } from "./import-job";

type Event =
  Awaited<ReturnType<ImportJobApi["jobEvents"]>> extends AsyncIterable<infer E> ? E : never;
type Job = Awaited<ReturnType<ImportJobApi["getJob"]>>;

const input = {
  data: {} as NormalizedImport,
  options: { importWatches: true, importWatchlist: true, importRatings: true } as ImportOptions,
};

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    status: "running",
    processedItems: 0,
    totalItems: 10,
    currentMessage: null,
    importedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
    warnings: [],
    ...overrides,
  };
}

function makeApi(options: {
  events?: Event[];
  /** Called between events; lets a test abort mid-stream. */
  beforeEvent?: (index: number) => void;
  getJob?: () => Promise<Job>;
  createJob?: () => Promise<{ id: string }>;
}): ImportJobApi {
  const { events = [], beforeEvent, getJob, createJob } = options;
  return {
    createJob: createJob ?? (() => Promise.resolve({ id: "job-1" })),
    jobEvents: () =>
      Promise.resolve(
        (async function* () {
          for (const [index, event] of events.entries()) {
            beforeEvent?.(index);
            yield event;
          }
        })(),
      ),
    getJob: getJob ?? (() => Promise.resolve(makeJob())),
  };
}

describe("runImportJob", () => {
  test("reports progress and resolves done on a complete event", async () => {
    const api = makeApi({
      events: [
        { type: "progress", job: makeJob({ processedItems: 1, currentMessage: "one" }) },
        { type: "progress", job: makeJob({ processedItems: 2 }) },
        {
          type: "complete",
          job: makeJob({
            status: "success",
            importedCount: 7,
            skippedCount: 2,
            failedCount: 1,
            errors: ["e"],
            warnings: ["w"],
          }),
        },
      ],
    });
    const onProgress = vi.fn<(progress: ImportProgress) => void>();

    const outcome = await runImportJob(api, input, new AbortController().signal, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, { current: 1, total: 10, message: "one" });
    expect(onProgress).toHaveBeenNthCalledWith(2, { current: 2, total: 10, message: "" });
    expect(outcome).toEqual({
      kind: "done",
      result: { imported: 7, skipped: 2, failed: 1, errors: ["e"], warnings: ["w"] },
    });
  });

  test("resolves background on a timeout event", async () => {
    const api = makeApi({ events: [{ type: "timeout", job: makeJob() }] });

    const outcome = await runImportJob(api, input, new AbortController().signal, () => {});

    expect(outcome).toEqual({ kind: "background" });
  });

  test("falls back to getJob when the stream ends: terminal status is done", async () => {
    const api = makeApi({
      getJob: () => Promise.resolve(makeJob({ status: "success", importedCount: 3 })),
    });

    const outcome = await runImportJob(api, input, new AbortController().signal, () => {});

    expect(outcome).toEqual({
      kind: "done",
      result: { imported: 3, skipped: 0, failed: 0, errors: [], warnings: [] },
    });
  });

  test("falls back to getJob when the stream ends: running status is background", async () => {
    const api = makeApi({ getJob: () => Promise.resolve(makeJob({ status: "running" })) });

    const outcome = await runImportJob(api, input, new AbortController().signal, () => {});

    expect(outcome).toEqual({ kind: "background" });
  });

  test("falls back to getJob when the stream ends: getJob failure is lost", async () => {
    const api = makeApi({ getJob: () => Promise.reject(new Error("network")) });

    const outcome = await runImportJob(api, input, new AbortController().signal, () => {});

    expect(outcome).toEqual({ kind: "lost" });
  });

  test("resolves aborted when the signal aborts mid-stream", async () => {
    const abort = new AbortController();
    const api = makeApi({
      events: [
        { type: "progress", job: makeJob({ processedItems: 1 }) },
        { type: "progress", job: makeJob({ processedItems: 2 }) },
      ],
      beforeEvent: (index) => {
        if (index === 1) abort.abort();
      },
    });
    const onProgress = vi.fn<(progress: ImportProgress) => void>();

    const outcome = await runImportJob(api, input, abort.signal, onProgress);

    expect(outcome).toEqual({ kind: "aborted" });
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  test("rejects with the same error when createJob fails", async () => {
    const error = new Error("already in progress");
    const api = makeApi({ createJob: () => Promise.reject(error) });

    await expect(runImportJob(api, input, new AbortController().signal, () => {})).rejects.toBe(
      error,
    );
  });
});
