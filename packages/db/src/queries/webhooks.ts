import { and, eq, gte } from "drizzle-orm";

import { db } from "../client";
import { integrationEvents, integrations, userEpisodeWatches, userMovieWatches } from "../schema";

export function getRecentMovieWatch(userId: string, titleId: string, since: Date) {
  return db
    .select()
    .from(userMovieWatches)
    .where(
      and(
        eq(userMovieWatches.userId, userId),
        eq(userMovieWatches.titleId, titleId),
        gte(userMovieWatches.watchedAt, since),
      ),
    )
    .get();
}

export function getRecentEpisodeWatch(userId: string, episodeId: string, since: Date) {
  return db
    .select()
    .from(userEpisodeWatches)
    .where(
      and(
        eq(userEpisodeWatches.userId, userId),
        eq(userEpisodeWatches.episodeId, episodeId),
        gte(userEpisodeWatches.watchedAt, since),
      ),
    )
    .get();
}

export function insertIntegrationEvent(values: typeof integrationEvents.$inferInsert): void {
  db.insert(integrationEvents).values(values).run();
}

export function updateIntegrationLastEvent(connectionId: string): void {
  db.update(integrations)
    .set({ lastEventAt: new Date() })
    .where(eq(integrations.id, connectionId))
    .run();
}
