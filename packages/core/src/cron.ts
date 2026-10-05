import {
  getCastEntryForTitle,
  getLibraryTitleIds as queryGetLibraryTitleIds,
  getReturningTvShows,
  getStaleTitles,
  getStaleNonLibraryTitles,
  getTitleByIdForCron,
  getTitleIdsCheckedBefore,
  getTitleIdsWithStaleSeasons,
  getTitlesWithFreshRecommendations,
  getTitlesWithStaleOffers,
  getTitlesWithStaleOffersFetchedBefore,
  insertCronRunReturning,
  updateCronRunError,
  updateCronRunSuccess,
} from "@sofa/db/queries/cron";

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

export function getLibraryTitleIds(): string[] {
  return queryGetLibraryTitleIds();
}

export function getThumbhashBackfillTitleIds(): string[] {
  return getLibraryTitleIds();
}

export function getStaleLibraryTitles(libraryIds: string[], staleDate: Date) {
  return getStaleTitles(libraryIds, staleDate);
}

export function getStaleNonLibraryTitlesForRefresh(staleDate: Date, limit: number) {
  return getStaleNonLibraryTitles(staleDate, limit);
}

export function getStaleAvailabilityTitles(libraryIds: string[], staleDate: Date) {
  const withOffers = getTitlesWithStaleOffers(libraryIds);
  const withStaleOffers = getTitlesWithStaleOffersFetchedBefore(libraryIds, staleDate);
  return { withOffers, withStaleOffers };
}

export {
  getCastEntryForTitle,
  getReturningTvShows,
  getTitleByIdForCron,
  getTitleIdsCheckedBefore,
  getTitleIdsWithStaleSeasons,
  getTitlesWithFreshRecommendations,
};
