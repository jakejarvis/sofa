import { and, count, eq, inArray } from "drizzle-orm";

import { db } from "../client";
import { episodes, seasons, titles } from "../schema";

export function getTitleById(titleId: string) {
  return db.select().from(titles).where(eq(titles.id, titleId)).get();
}

export function getExistingTitlesByTmdbIds(tmdbIds: number[]) {
  if (tmdbIds.length === 0) return [];
  return db.select().from(titles).where(inArray(titles.tmdbId, tmdbIds)).all();
}

export function findSeasonByTitleAndNumber(titleId: string, seasonNumber: number) {
  return db
    .select()
    .from(seasons)
    .where(and(eq(seasons.titleId, titleId), eq(seasons.seasonNumber, seasonNumber)))
    .get();
}

export function findEpisodeBySeasonAndNumber(seasonId: string, episodeNumber: number) {
  return db
    .select()
    .from(episodes)
    .where(and(eq(episodes.seasonId, seasonId), eq(episodes.episodeNumber, episodeNumber)))
    .get();
}

export function getTitleCount(): number {
  const result = db.select({ count: count() }).from(titles).get();
  return result?.count ?? 0;
}
