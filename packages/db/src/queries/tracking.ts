import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../client";
import {
  episodes,
  seasons,
  titles,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "../schema";

export function upsertTitleStatus(
  userId: string,
  titleId: string,
  status: "watchlist" | "in_progress" | "completed",
  addedAt?: Date,
): void {
  const now = addedAt ?? new Date();
  db.insert(userTitleStatus)
    .values({ userId, titleId, status, addedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [userTitleStatus.userId, userTitleStatus.titleId],
      set: { status, updatedAt: now },
    })
    .run();
}

export function deleteTitleStatus(userId: string, titleId: string): void {
  db.delete(userTitleStatus)
    .where(and(eq(userTitleStatus.userId, userId), eq(userTitleStatus.titleId, titleId)))
    .run();
}

export function insertMovieWatch(
  userId: string,
  titleId: string,
  watchedAt: Date,
  source: "manual" | "import" | "plex" | "jellyfin" | "emby",
): void {
  db.insert(userMovieWatches).values({ userId, titleId, watchedAt, source }).run();
}

export function insertEpisodeWatch(
  userId: string,
  episodeId: string,
  watchedAt: Date,
  source: "manual" | "import" | "plex" | "jellyfin" | "emby",
): void {
  db.insert(userEpisodeWatches).values({ userId, episodeId, watchedAt, source }).run();
}

export function getTitleStatus(userId: string, titleId: string) {
  return db
    .select()
    .from(userTitleStatus)
    .where(and(eq(userTitleStatus.userId, userId), eq(userTitleStatus.titleId, titleId)))
    .get();
}

export function getEpisodeTitleId(episodeId: string): string | null {
  const row = db
    .select({ titleId: seasons.titleId })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(eq(episodes.id, episodeId))
    .get();
  return row?.titleId ?? null;
}

export function getEpisodeTitleIds(episodeIds: string[]): Map<string, string> {
  if (episodeIds.length === 0) return new Map();
  const rows = db
    .select({ episodeId: episodes.id, titleId: seasons.titleId })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(inArray(episodes.id, episodeIds))
    .all();
  return new Map(rows.map((r) => [r.episodeId, r.titleId]));
}

export function batchInsertEpisodeWatchesTransaction(
  userId: string,
  episodeIds: string[],
  source: "manual" | "import" | "plex" | "jellyfin" | "emby",
  watchedAt?: Date,
): { titleId: string | null } {
  if (episodeIds.length === 0) return { titleId: null };

  let resultTitleId: string | null = null;

  db.transaction((tx) => {
    const now = watchedAt ?? new Date();

    for (const episodeId of episodeIds) {
      tx.insert(userEpisodeWatches).values({ userId, episodeId, watchedAt: now, source }).run();
    }

    const eps = tx.select().from(episodes).where(inArray(episodes.id, episodeIds)).all();
    if (eps.length === 0) return;

    const seasonIds = [...new Set(eps.map((e) => e.seasonId))];
    const seasonRows = tx.select().from(seasons).where(inArray(seasons.id, seasonIds)).all();
    if (seasonRows.length === 0) return;

    const { titleId } = seasonRows[0];
    resultTitleId = titleId;

    const existing = tx
      .select()
      .from(userTitleStatus)
      .where(and(eq(userTitleStatus.userId, userId), eq(userTitleStatus.titleId, titleId)))
      .get();

    if (!existing || existing.status === "watchlist") {
      const statusNow = new Date();
      tx.insert(userTitleStatus)
        .values({
          userId,
          titleId,
          status: "in_progress",
          addedAt: statusNow,
          updatedAt: statusNow,
        })
        .onConflictDoUpdate({
          target: [userTitleStatus.userId, userTitleStatus.titleId],
          set: { status: "in_progress", updatedAt: statusNow },
        })
        .run();
    }
  });

  return { titleId: resultTitleId };
}

export function getAllEpisodeIdsForTitle(titleId: string): string[] {
  return db
    .select({ id: episodes.id })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(eq(seasons.titleId, titleId))
    .all()
    .map((ep) => ep.id);
}

export function getExistingEpisodeWatchIds(userId: string, episodeIds: string[]): Set<string> {
  if (episodeIds.length === 0) return new Set();
  return new Set(
    db
      .select({ episodeId: userEpisodeWatches.episodeId })
      .from(userEpisodeWatches)
      .where(
        and(
          eq(userEpisodeWatches.userId, userId),
          inArray(userEpisodeWatches.episodeId, episodeIds),
        ),
      )
      .all()
      .map((w) => w.episodeId),
  );
}

export function batchInsertMissingEpisodeWatches(
  userId: string,
  episodeIds: string[],
  existingWatches: Set<string>,
  source: "manual" | "import" | "plex" | "jellyfin" | "emby",
  watchedAt: Date,
): void {
  db.transaction((tx) => {
    for (const episodeId of episodeIds) {
      if (!existingWatches.has(episodeId)) {
        tx.insert(userEpisodeWatches).values({ userId, episodeId, watchedAt, source }).run();
      }
    }
  });
}

export function countDistinctEpisodeWatches(userId: string, episodeIds: string[]): number {
  if (episodeIds.length === 0) return 0;
  const result = db
    .select({
      count: sql<number>`count(distinct ${userEpisodeWatches.episodeId})`,
    })
    .from(userEpisodeWatches)
    .where(
      and(eq(userEpisodeWatches.userId, userId), inArray(userEpisodeWatches.episodeId, episodeIds)),
    )
    .get();
  return result?.count ?? 0;
}

export function upsertRating(
  userId: string,
  titleId: string,
  ratingStars: number,
  ratedAt: Date,
): void {
  db.insert(userRatings)
    .values({ userId, titleId, ratingStars, ratedAt })
    .onConflictDoUpdate({
      target: [userRatings.userId, userRatings.titleId],
      set: { ratingStars, ratedAt },
    })
    .run();
}

export function deleteRating(userId: string, titleId: string): void {
  db.delete(userRatings)
    .where(and(eq(userRatings.userId, userId), eq(userRatings.titleId, titleId)))
    .run();
}

export function getUserStatusesByTitleIds(userId: string, titleIds: string[]) {
  if (titleIds.length === 0) return [];
  return db
    .select({
      titleId: userTitleStatus.titleId,
      status: userTitleStatus.status,
    })
    .from(userTitleStatus)
    .where(and(eq(userTitleStatus.userId, userId), inArray(userTitleStatus.titleId, titleIds)))
    .all();
}

export function getEpisodeProgressByTitleIds(userId: string, titleIds: string[]) {
  if (titleIds.length === 0) return [];
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select({
      titleId: titles.id,
      totalEpisodes:
        sql<number>`count(distinct case when ${episodes.airDate} IS NOT NULL AND ${episodes.airDate} <= ${today} then ${episodes.id} end)`.as(
          "totalEpisodes",
        ),
      watchedEpisodes:
        sql<number>`count(distinct case when ${userEpisodeWatches.id} is not null AND ${episodes.airDate} IS NOT NULL AND ${episodes.airDate} <= ${today} then ${episodes.id} end)`.as(
          "watchedEpisodes",
        ),
    })
    .from(titles)
    .innerJoin(seasons, eq(seasons.titleId, titles.id))
    .innerJoin(episodes, eq(episodes.seasonId, seasons.id))
    .leftJoin(
      userEpisodeWatches,
      and(eq(userEpisodeWatches.episodeId, episodes.id), eq(userEpisodeWatches.userId, userId)),
    )
    .where(and(inArray(titles.id, titleIds), eq(titles.type, "tv")))
    .groupBy(titles.id)
    .all();
}

export function getUserTitleInfo(userId: string, titleId: string) {
  const info = db
    .select({
      status: userTitleStatus.status,
      ratingStars: userRatings.ratingStars,
    })
    .from(userTitleStatus)
    .leftJoin(
      userRatings,
      and(
        eq(userRatings.userId, userTitleStatus.userId),
        eq(userRatings.titleId, userTitleStatus.titleId),
      ),
    )
    .where(and(eq(userTitleStatus.userId, userId), eq(userTitleStatus.titleId, titleId)))
    .get();

  const watchedEpisodeIds = db
    .selectDistinct({ episodeId: userEpisodeWatches.episodeId })
    .from(userEpisodeWatches)
    .innerJoin(episodes, eq(userEpisodeWatches.episodeId, episodes.id))
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(and(eq(userEpisodeWatches.userId, userId), eq(seasons.titleId, titleId)))
    .all()
    .map((w) => w.episodeId);

  return {
    status: info?.status ?? null,
    rating: info?.ratingStars ?? null,
    episodeWatches: watchedEpisodeIds,
  };
}

export function getSeasonEpisodes(seasonId: string) {
  return db.select().from(episodes).where(eq(episodes.seasonId, seasonId)).all();
}

export function getSeasonEpisodeIds(seasonId: string): string[] {
  return db
    .select({ id: episodes.id })
    .from(episodes)
    .where(eq(episodes.seasonId, seasonId))
    .all()
    .map((e) => e.id);
}

export function getSeasonById(seasonId: string) {
  return db.select().from(seasons).where(eq(seasons.id, seasonId)).get();
}

export function deleteEpisodeWatches(userId: string, episodeIds: string[]): void {
  if (episodeIds.length === 0) return;
  db.delete(userEpisodeWatches)
    .where(
      and(eq(userEpisodeWatches.userId, userId), inArray(userEpisodeWatches.episodeId, episodeIds)),
    )
    .run();
}

export function deleteEpisodeWatch(userId: string, episodeId: string): void {
  db.delete(userEpisodeWatches)
    .where(and(eq(userEpisodeWatches.userId, userId), eq(userEpisodeWatches.episodeId, episodeId)))
    .run();
}

export function deleteMovieWatches(userId: string, titleId: string): void {
  db.delete(userMovieWatches)
    .where(and(eq(userMovieWatches.userId, userId), eq(userMovieWatches.titleId, titleId)))
    .run();
}

export function deleteAllEpisodeWatchesForTitle(userId: string, titleId: string): void {
  const titleEpisodeIds = db
    .select({ id: episodes.id })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(eq(seasons.titleId, titleId))
    .all()
    .map((r) => r.id);

  if (titleEpisodeIds.length === 0) return;
  deleteEpisodeWatches(userId, titleEpisodeIds);
}
