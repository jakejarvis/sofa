import { and, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";

import { db } from "../client";
import {
  availabilityOffers,
  cronRuns,
  episodes,
  persons,
  seasons,
  titleCast,
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

export function getTitlesWithMissingThumbhashes() {
  return db
    .select({ id: titles.id })
    .from(titles)
    .where(
      or(
        and(isNotNull(titles.posterPath), sql`${titles.posterThumbHash} IS NULL`),
        and(isNotNull(titles.backdropPath), sql`${titles.backdropThumbHash} IS NULL`),
      ),
    )
    .all()
    .map((row) => row.id);
}

export function getTitleIdsWithMissingSeasonThumbhashes() {
  return db
    .select({ titleId: seasons.titleId })
    .from(seasons)
    .where(and(isNotNull(seasons.posterPath), sql`${seasons.posterThumbHash} IS NULL`))
    .groupBy(seasons.titleId)
    .all()
    .map((row) => row.titleId);
}

export function getTitleIdsWithMissingEpisodeThumbhashes() {
  return db
    .select({ titleId: seasons.titleId })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(and(isNotNull(episodes.stillPath), sql`${episodes.stillThumbHash} IS NULL`))
    .groupBy(seasons.titleId)
    .all()
    .map((row) => row.titleId);
}

export function getTitleIdsWithMissingProfileThumbhashes() {
  return db
    .select({ titleId: titleCast.titleId })
    .from(titleCast)
    .innerJoin(persons, eq(titleCast.personId, persons.id))
    .where(and(isNotNull(persons.profilePath), sql`${persons.profileThumbHash} IS NULL`))
    .groupBy(titleCast.titleId)
    .all()
    .map((row) => row.titleId);
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
      .select({ titleId: availabilityOffers.titleId })
      .from(availabilityOffers)
      .where(inArray(availabilityOffers.titleId, titleIds))
      .groupBy(availabilityOffers.titleId)
      .all()
      .map((r) => r.titleId),
  );
}

export function getTitlesWithStaleOffersFetchedBefore(titleIds: string[], staleDate: Date) {
  if (titleIds.length === 0) return new Set<string>();
  return new Set(
    db
      .select({ titleId: availabilityOffers.titleId })
      .from(availabilityOffers)
      .where(
        and(
          inArray(availabilityOffers.titleId, titleIds),
          lt(availabilityOffers.lastFetchedAt, staleDate),
        ),
      )
      .groupBy(availabilityOffers.titleId)
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
