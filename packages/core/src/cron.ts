import {
  getLibraryTitleIds as queryGetLibraryTitleIds,
  getRefreshCandidates,
  getReturningTvShows,
  getStaleTitles,
  getStaleNonLibraryTitles,
  getTitleByIdForCron,
  getTitleIdsCheckedBefore,
  getTitleIdsWithStaleSeasons,
  insertCronRunReturning,
  markInterruptedCronRuns,
  updateCronRunError,
  updateCronRunSuccess,
} from "@sofa/db/queries/cron";
import { getSeasonsForTitle } from "@sofa/db/queries/metadata";

/**
 * Run `fn` for each item in order, isolating failures so one bad item (e.g. a
 * title TMDB has removed) doesn't abort the rest of a cron job. Each failure is
 * reported via `onItemError`. Throws only when at least one item was attempted
 * and every attempt failed, so a total outage still marks the run as failed.
 */
export async function runIsolated<T>(
  items: readonly T[],
  fn: (item: T) => Promise<void>,
  onItemError: (item: T, err: unknown) => void,
): Promise<{ attempted: number; failed: number }> {
  let failed = 0;
  let firstError: unknown;
  for (const item of items) {
    try {
      await fn(item);
    } catch (err) {
      failed++;
      firstError ??= err;
      onItemError(item, err);
    }
  }
  if (items.length > 0 && failed === items.length) {
    const reason = firstError instanceof Error ? firstError.message : String(firstError);
    throw new Error(`All ${items.length} items failed (first error: ${reason})`);
  }
  return { attempted: items.length, failed };
}

export function startCronRun(jobName: string) {
  return insertCronRunReturning(jobName);
}

export function completeCronRun(runId: string, durationMs: number): void {
  updateCronRunSuccess(runId, durationMs);
}

export function failCronRun(runId: string, durationMs: number, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  updateCronRunError(runId, durationMs, errorMessage);
}

/** Mark runs left "running" by a previous process as failed. Returns how many were recovered. */
export function recoverInterruptedCronRuns(): number {
  return markInterruptedCronRuns();
}

export function getLibraryTitleIds(): string[] {
  return queryGetLibraryTitleIds();
}

export function getThumbhashBackfillTitleIds(): string[] {
  return getLibraryTitleIds();
}

export function getStaleLibraryTitles(libraryIds: string[], staleDate: Date) {
  return getStaleTitles(libraryIds, staleDate);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SETTLED_TV_STATUSES = new Set(["Ended", "Canceled"]);

/** How long a library title's metadata stays fresh. Settled titles rarely change on TMDB. */
export function libraryRefreshIntervalMs(
  title: { type: string; status: string | null; releaseDate: string | null },
  now = new Date(),
): number {
  if (title.type === "tv" && title.status && SETTLED_TV_STATUSES.has(title.status)) {
    return 60 * DAY_MS;
  }
  if (title.type === "movie" && title.releaseDate) {
    const released = Date.parse(`${title.releaseDate}T00:00:00Z`);
    if (Number.isFinite(released) && now.getTime() - released > 365 * DAY_MS) return 60 * DAY_MS;
  }
  return 7 * DAY_MS;
}

/** Library title ids whose metadata is due for a refresh. */
export function getLibraryTitlesDueForRefresh(libraryIds: string[], now = new Date()): string[] {
  return getRefreshCandidates(libraryIds)
    .filter(
      (t) =>
        !t.lastFetchedAt ||
        now.getTime() - t.lastFetchedAt.getTime() >= libraryRefreshIntervalMs(t, now),
    )
    .map((t) => t.id);
}

/** Season numbers Sofa has stored for a title. */
export function getStoredSeasonNumbers(titleId: string): number[] {
  return getSeasonsForTitle(titleId).map((s) => s.seasonNumber);
}

export function getStaleNonLibraryTitlesForRefresh(staleDate: Date, limit: number) {
  return getStaleNonLibraryTitles(staleDate, limit);
}

export {
  getReturningTvShows,
  getTitleByIdForCron,
  getTitleIdsCheckedBefore,
  getTitleIdsWithStaleSeasons,
};
