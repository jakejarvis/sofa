import { and, eq, inArray } from "drizzle-orm";

import { db } from "../client";
import { integrations, titles, userTitleStatus } from "../schema";

export function resolveListIntegration(token: string) {
  return db
    .select({
      userId: integrations.userId,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.token, token),
        eq(integrations.type, "list"),
        eq(integrations.enabled, true),
      ),
    )
    .get();
}

export function getRadarrMovies(
  userId: string,
  statuses: ("watchlist" | "in_progress" | "completed")[],
) {
  return db
    .select({ tmdbId: titles.tmdbId })
    .from(userTitleStatus)
    .innerJoin(titles, eq(userTitleStatus.titleId, titles.id))
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(titles.type, "movie"),
        inArray(userTitleStatus.status, statuses),
      ),
    )
    .all();
}

export function getSonarrShows(
  userId: string,
  statuses: ("watchlist" | "in_progress" | "completed")[],
) {
  return db
    .select({
      id: titles.id,
      tmdbId: titles.tmdbId,
      tvdbId: titles.tvdbId,
      title: titles.title,
    })
    .from(userTitleStatus)
    .innerJoin(titles, eq(userTitleStatus.titleId, titles.id))
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(titles.type, "tv"),
        inArray(userTitleStatus.status, statuses),
      ),
    )
    .all();
}

export function batchUpdateTvdbIds(updates: { titleId: string; tvdbId: number }[]): void {
  if (updates.length === 0) return;
  db.transaction((tx) => {
    for (const { titleId, tvdbId } of updates) {
      tx.update(titles).set({ tvdbId }).where(eq(titles.id, titleId)).run();
    }
  });
}
