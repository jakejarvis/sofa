import {
  getCastEntryForTitle,
  getLibraryTitleIds as queryGetLibraryTitleIds,
  getReturningTvShows,
  getStaleTitles,
  getStaleNonLibraryTitles,
  getTitleByIdForCron,
  getTitleIdsWithStaleSeasons,
  getTitlesWithFreshRecommendations,
  getTitlesWithStaleOffers,
  getTitlesWithStaleOffersFetchedBefore,
  insertCronRunReturning,
  updateCronRunError,
  updateCronRunSuccess,
} from "@sofa/db/queries/cron";

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
  getTitleIdsWithStaleSeasons,
  getTitlesWithFreshRecommendations,
};
