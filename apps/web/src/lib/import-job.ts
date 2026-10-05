import type { NormalizedImport } from "@sofa/api/schemas";

export interface ImportProgress {
  current: number;
  total: number;
  message: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

export interface ImportOptions {
  importWatches: boolean;
  importWatchlist: boolean;
  importRatings: boolean;
}

interface JobSnapshot {
  status: string;
  processedItems: number;
  totalItems: number;
  currentMessage: string | null;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  warnings: string[];
}

/** The subset of `client.imports` the runner needs (injectable for tests). */
export interface ImportJobApi {
  createJob(input: { data: NormalizedImport; options: ImportOptions }): Promise<{ id: string }>;
  jobEvents(
    input: { id: string },
    opts: { signal: AbortSignal },
  ): Promise<AsyncIterable<{ type: "progress" | "complete" | "timeout"; job: JobSnapshot }>>;
  getJob(input: { id: string }): Promise<JobSnapshot>;
}

export type ImportJobOutcome =
  | { kind: "done"; result: ImportResult }
  | { kind: "background" } // still running on the server
  | { kind: "lost" } // stream dropped and the job status couldn't be read
  | { kind: "aborted" };

const TERMINAL = new Set(["success", "error", "cancelled"]);

function toResult(job: JobSnapshot): ImportResult {
  return {
    imported: job.importedCount,
    skipped: job.skippedCount,
    failed: job.failedCount,
    errors: job.errors,
    warnings: job.warnings,
  };
}

/** Create an import job and follow it to completion. Throws if the job can't be created. */
export async function runImportJob(
  api: ImportJobApi,
  input: { data: NormalizedImport; options: ImportOptions },
  signal: AbortSignal,
  onProgress: (progress: ImportProgress) => void,
): Promise<ImportJobOutcome> {
  const job = await api.createJob(input);
  const events = await api.jobEvents({ id: job.id }, { signal });
  for await (const event of events) {
    if (signal.aborted) return { kind: "aborted" };
    if (event.type === "complete") return { kind: "done", result: toResult(event.job) };
    if (event.type === "timeout") return { kind: "background" };
    onProgress({
      current: event.job.processedItems,
      total: event.job.totalItems,
      message: event.job.currentMessage ?? "",
    });
  }
  if (signal.aborted) return { kind: "aborted" };
  try {
    const finalJob = await api.getJob({ id: job.id });
    return TERMINAL.has(finalJob.status)
      ? { kind: "done", result: toResult(finalJob) }
      : { kind: "background" };
  } catch {
    return { kind: "lost" };
  }
}
