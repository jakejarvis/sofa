import { and, asc, eq, inArray, isNotNull, isNull, lt, notExists, or, sql } from "drizzle-orm";

import { db } from "../client";
import { cronRuns, seasons, titles, userTitleStatus } from "../schema";

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

/** Mark runs left "running" by a previous process as errors (called once at startup). */
export function markInterruptedCronRuns(): number {
  return db
    .update(cronRuns)
    .set({ status: "error", finishedAt: new Date(), errorMessage: "Interrupted by server restart" })
    .where(eq(cronRuns.status, "running"))
    .returning({ id: cronRuns.id })
    .all().length;
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
    .where(
      and(
        inArray(titles.id, titleIds),
        or(isNull(titles.lastFetchedAt), lt(titles.lastFetchedAt, staleDate)),
      ),
    )
    .all();
}

export function getStaleNonLibraryTitles(staleDate: Date, limit: number) {
  return db
    .select({ id: titles.id })
    .from(titles)
    .where(
      and(
        isNotNull(titles.lastFetchedAt),
        lt(titles.lastFetchedAt, staleDate),
        notExists(
          db
            .select({ one: sql`1` })
            .from(userTitleStatus)
            .where(eq(userTitleStatus.titleId, titles.id)),
        ),
      ),
    )
    .orderBy(asc(titles.lastFetchedAt))
    .limit(limit)
    .all();
}

/** Record a refresh attempt so a title that keeps failing doesn't stay at the front of the queue. */
export function markTitleRefreshAttempted(titleId: string, at: Date = new Date()): void {
  db.update(titles).set({ lastFetchedAt: at }).where(eq(titles.id, titleId)).run();
}

export function getReturningTvShows() {
  const returningStatuses = ["Returning Series", "In Production"];
  return db
    .select({ id: titles.id, tmdbId: titles.tmdbId })
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

/**
 * Titles whose most recent season fetch is older than `staleDate`. Uses the latest
 * season fetch (not any season) because partial refreshes only touch the newest seasons.
 */
export function getTitleIdsWithStaleSeasons(titleIds: string[], staleDate: Date) {
  if (titleIds.length === 0) return new Set<string>();
  return new Set(
    db
      .select({ titleId: seasons.titleId })
      .from(seasons)
      .where(inArray(seasons.titleId, titleIds))
      .groupBy(seasons.titleId)
      .having(sql`max(${seasons.lastFetchedAt}) < ${sql.param(staleDate, seasons.lastFetchedAt)}`)
      .all()
      .map((r) => r.titleId),
  );
}

export function getTitleByIdForCron(titleId: string) {
  return db.select().from(titles).where(eq(titles.id, titleId)).get();
}

export function deleteOldCronRuns(beforeDate: Date): number {
  return db
    .delete(cronRuns)
    .where(lt(cronRuns.startedAt, beforeDate))
    .returning({ id: cronRuns.id })
    .all().length;
}

type CheckedAtColumn = "availabilityCheckedAt" | "recommendationsCheckedAt" | "creditsCheckedAt";

/** Ids (from `titleIds`) whose `column` is null or older than `staleDate`. */
export function getTitleIdsCheckedBefore(
  titleIds: string[],
  column: CheckedAtColumn,
  staleDate: Date,
): string[] {
  if (titleIds.length === 0) return [];
  const col = titles[column];
  return db
    .select({ id: titles.id })
    .from(titles)
    .where(and(inArray(titles.id, titleIds), or(isNull(col), lt(col, staleDate))))
    .all()
    .map((r) => r.id);
}

export function getRefreshCandidates(titleIds: string[]) {
  if (titleIds.length === 0) return [];
  return db
    .select({
      id: titles.id,
      type: titles.type,
      status: titles.status,
      releaseDate: titles.releaseDate,
      lastFetchedAt: titles.lastFetchedAt,
    })
    .from(titles)
    .where(inArray(titles.id, titleIds))
    .all();
}
