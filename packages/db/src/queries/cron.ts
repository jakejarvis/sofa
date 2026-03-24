import { and, eq, gte, inArray, isNotNull, lt, or } from "drizzle-orm";

import { db } from "../client";
import {
  cronRuns,
  seasons,
  titleAvailability,
  titleCast,
  titleRecommendations,
  titles,
  userTitleStatus,
} from "../schema";

export function insertCronRunReturning(jobName: string) {
  return db
    .insert(cronRuns)
    .values({ jobName, status: "running", startedAt: new Date() })
    .returning()
    .get();
}

export function updateCronRunSuccess(id: string, durationMs: number): void {
  db.update(cronRuns)
    .set({ status: "success", finishedAt: new Date(), durationMs })
    .where(eq(cronRuns.id, id))
    .run();
}

export function updateCronRunError(id: string, durationMs: number, errorMessage: string): void {
  db.update(cronRuns)
    .set({ status: "error", finishedAt: new Date(), durationMs, errorMessage })
    .where(eq(cronRuns.id, id))
    .run();
}

export function getLibraryTitleIds(): string[] {
  return db
    .select({ titleId: userTitleStatus.titleId })
    .from(userTitleStatus)
    .groupBy(userTitleStatus.titleId)
    .all()
    .map((r) => r.titleId);
}

export function getStaleTitles(titleIds: string[], staleDate: Date) {
  if (titleIds.length === 0) return [];
  return db
    .select({ id: titles.id })
    .from(titles)
    .where(and(inArray(titles.id, titleIds), lt(titles.lastFetchedAt, staleDate)))
    .all();
}

export function getStaleNonLibraryTitles(staleDate: Date, limit: number) {
  return db
    .select()
    .from(titles)
    .where(and(isNotNull(titles.lastFetchedAt), lt(titles.lastFetchedAt, staleDate)))
    .limit(limit)
    .all();
}

export function getTitlesWithStaleOffers(titleIds: string[]) {
  if (titleIds.length === 0) return new Set<string>();
  return new Set(
    db
      .select({ titleId: titleAvailability.titleId })
      .from(titleAvailability)
      .where(inArray(titleAvailability.titleId, titleIds))
      .groupBy(titleAvailability.titleId)
      .all()
      .map((r) => r.titleId),
  );
}

export function getTitlesWithStaleOffersFetchedBefore(titleIds: string[], staleDate: Date) {
  if (titleIds.length === 0) return new Set<string>();
  return new Set(
    db
      .select({ titleId: titleAvailability.titleId })
      .from(titleAvailability)
      .where(
        and(
          inArray(titleAvailability.titleId, titleIds),
          lt(titleAvailability.lastFetchedAt, staleDate),
        ),
      )
      .groupBy(titleAvailability.titleId)
      .all()
      .map((r) => r.titleId),
  );
}

export function getReturningTvShows() {
  const returningStatuses = ["Returning Series", "In Production"];
  return db
    .select()
    .from(titles)
    .where(
      and(
        eq(titles.type, "tv"),
        isNotNull(titles.lastFetchedAt),
        or(...returningStatuses.map((s) => eq(titles.status, s))),
      ),
    )
    .all();
}

export function getTitleIdsWithStaleSeasons(titleIds: string[], staleDate: Date) {
  if (titleIds.length === 0) return new Set<string>();
  return new Set(
    db
      .select({ titleId: seasons.titleId })
      .from(seasons)
      .where(and(inArray(seasons.titleId, titleIds), lt(seasons.lastFetchedAt, staleDate)))
      .groupBy(seasons.titleId)
      .all()
      .map((r) => r.titleId),
  );
}

export function getTitleByIdForCron(titleId: string) {
  return db.select().from(titles).where(eq(titles.id, titleId)).get();
}

export function getCastEntryForTitle(titleId: string) {
  return db.select().from(titleCast).where(eq(titleCast.titleId, titleId)).limit(1).get();
}

export function deleteOldCronRuns(beforeDate: Date): number {
  const old = db
    .select({ id: cronRuns.id })
    .from(cronRuns)
    .where(lt(cronRuns.startedAt, beforeDate))
    .all();
  if (old.length === 0) return 0;
  const ids = old.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 500) {
    db.delete(cronRuns)
      .where(inArray(cronRuns.id, ids.slice(i, i + 500)))
      .run();
  }
  return old.length;
}

export function getTitlesWithFreshRecommendations(
  titleIds: string[],
  sinceDate: Date,
): Set<string> {
  if (titleIds.length === 0) return new Set();

  return new Set(
    db
      .select({ titleId: titleRecommendations.titleId })
      .from(titleRecommendations)
      .where(
        and(
          inArray(titleRecommendations.titleId, titleIds),
          // All recs for a title share the same lastFetchedAt, so any row suffices
          gte(titleRecommendations.lastFetchedAt, sinceDate),
        ),
      )
      .groupBy(titleRecommendations.titleId)
      .all()
      .map((r) => r.titleId),
  );
}
