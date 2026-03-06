import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  episodes,
  seasons,
  titles,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "@/lib/db/schema";

export function setTitleStatus(
  userId: string,
  titleId: string,
  status: "watchlist" | "in_progress" | "completed",
  // biome-ignore lint/correctness/noUnusedFunctionParameters: kept for API consistency with callers
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
) {
  const now = new Date();
  db.insert(userTitleStatus)
    .values({ userId, titleId, status, addedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [userTitleStatus.userId, userTitleStatus.titleId],
      set: { status, updatedAt: now },
    })
    .run();
}

export function removeTitleStatus(userId: string, titleId: string) {
  db.delete(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.titleId, titleId),
      ),
    )
    .run();
}

export function logMovieWatch(
  userId: string,
  titleId: string,
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
) {
  const now = new Date();
  db.insert(userMovieWatches)
    .values({ userId, titleId, watchedAt: now, source })
    .run();

  // Auto-set status to completed
  const existing = db
    .select()
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.titleId, titleId),
      ),
    )
    .get();

  if (!existing) {
    setTitleStatus(userId, titleId, "completed", source);
  } else if (existing.status !== "completed") {
    setTitleStatus(userId, titleId, "completed", source);
  }
}

export function logEpisodeWatch(
  userId: string,
  episodeId: string,
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
) {
  const now = new Date();
  db.insert(userEpisodeWatches)
    .values({ userId, episodeId, watchedAt: now, source })
    .run();

  // Find the title for this episode
  const ep = db.select().from(episodes).where(eq(episodes.id, episodeId)).get();
  if (!ep) return;
  const season = db
    .select()
    .from(seasons)
    .where(eq(seasons.id, ep.seasonId))
    .get();
  if (!season) return;
  const titleId = season.titleId;

  // Auto-set status to in_progress if not set
  const existing = db
    .select()
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.titleId, titleId),
      ),
    )
    .get();

  if (!existing) {
    setTitleStatus(userId, titleId, "in_progress", source);
  }

  // Check if all episodes are watched -> auto-complete
  checkAllEpisodesWatched(userId, titleId);
}

export function logEpisodeWatchBatch(
  userId: string,
  episodeIds: string[],
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
) {
  if (episodeIds.length === 0) return;

  db.transaction((tx) => {
    const now = new Date();

    // Batch INSERT all watch records
    for (const episodeId of episodeIds) {
      tx.insert(userEpisodeWatches)
        .values({ userId, episodeId, watchedAt: now, source })
        .run();
    }

    // Resolve episode → season → title hierarchy with batch queries
    const eps = tx
      .select()
      .from(episodes)
      .where(inArray(episodes.id, episodeIds))
      .all();
    if (eps.length === 0) return;

    const seasonIds = [...new Set(eps.map((e) => e.seasonId))];
    const seasonRows = tx
      .select()
      .from(seasons)
      .where(inArray(seasons.id, seasonIds))
      .all();
    if (seasonRows.length === 0) return;

    const titleId = seasonRows[0].titleId;

    // Set status to in_progress if not already set
    const existing = tx
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, userId),
          eq(userTitleStatus.titleId, titleId),
        ),
      )
      .get();

    if (!existing) {
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

    // Check completion once (not per-episode)
    const allSeasons = tx
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, titleId))
      .all();
    if (allSeasons.length === 0) return;

    const allSeasonIds = allSeasons.map((s) => s.id);
    const allEps = tx
      .select()
      .from(episodes)
      .where(inArray(episodes.seasonId, allSeasonIds))
      .all();
    const totalEpisodes = allEps.length;
    if (totalEpisodes === 0) return;

    const allEpIds = allEps.map((ep) => ep.id);
    const [watchCount] = tx
      .select({
        count: sql<number>`count(distinct ${userEpisodeWatches.episodeId})`,
      })
      .from(userEpisodeWatches)
      .where(
        and(
          eq(userEpisodeWatches.userId, userId),
          inArray(userEpisodeWatches.episodeId, allEpIds),
        ),
      )
      .all();

    if (watchCount.count >= totalEpisodes) {
      const completeNow = new Date();
      tx.insert(userTitleStatus)
        .values({
          userId,
          titleId,
          status: "completed",
          addedAt: completeNow,
          updatedAt: completeNow,
        })
        .onConflictDoUpdate({
          target: [userTitleStatus.userId, userTitleStatus.titleId],
          set: { status: "completed", updatedAt: completeNow },
        })
        .run();
    }
  });
}

export function markAllEpisodesWatched(
  userId: string,
  titleId: string,
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title || title.type !== "tv") return;

  const now = new Date();
  const allSeasons = db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  const seasonIds = allSeasons.map((s) => s.id);
  const allEps =
    seasonIds.length > 0
      ? db
          .select()
          .from(episodes)
          .where(inArray(episodes.seasonId, seasonIds))
          .all()
      : [];

  const epIds = allEps.map((ep) => ep.id);
  const existingWatches =
    epIds.length > 0
      ? new Set(
          db
            .select({ episodeId: userEpisodeWatches.episodeId })
            .from(userEpisodeWatches)
            .where(
              and(
                eq(userEpisodeWatches.userId, userId),
                inArray(userEpisodeWatches.episodeId, epIds),
              ),
            )
            .all()
            .map((w) => w.episodeId),
        )
      : new Set<string>();

  db.transaction((tx) => {
    for (const ep of allEps) {
      if (!existingWatches.has(ep.id)) {
        tx.insert(userEpisodeWatches)
          .values({ userId, episodeId: ep.id, watchedAt: now, source })
          .run();
      }
    }
  });

  setTitleStatus(userId, titleId, "completed", source);
}

function checkAllEpisodesWatched(userId: string, titleId: string) {
  const allSeasons = db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  if (allSeasons.length === 0) return;

  const seasonIds = allSeasons.map((s) => s.id);
  const allEps = db
    .select()
    .from(episodes)
    .where(inArray(episodes.seasonId, seasonIds))
    .all();

  const totalEpisodes = allEps.length;
  if (totalEpisodes === 0) return;

  const epIds = allEps.map((ep) => ep.id);
  const [watchCount] = db
    .select({
      count: sql<number>`count(distinct ${userEpisodeWatches.episodeId})`,
    })
    .from(userEpisodeWatches)
    .where(
      and(
        eq(userEpisodeWatches.userId, userId),
        inArray(userEpisodeWatches.episodeId, epIds),
      ),
    )
    .all();

  if (watchCount.count >= totalEpisodes) {
    setTitleStatus(userId, titleId, "completed");
  }
}

export function unwatchEpisode(userId: string, episodeId: string) {
  db.delete(userEpisodeWatches)
    .where(
      and(
        eq(userEpisodeWatches.userId, userId),
        eq(userEpisodeWatches.episodeId, episodeId),
      ),
    )
    .run();

  // Find parent title and downgrade from completed to in_progress
  const ep = db.select().from(episodes).where(eq(episodes.id, episodeId)).get();
  if (!ep) return;
  const season = db
    .select()
    .from(seasons)
    .where(eq(seasons.id, ep.seasonId))
    .get();
  if (!season) return;

  const existing = db
    .select()
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.titleId, season.titleId),
      ),
    )
    .get();

  if (existing?.status === "completed") {
    setTitleStatus(userId, season.titleId, "in_progress");
  }
}

export function unwatchSeason(userId: string, seasonId: string) {
  const seasonEps = db
    .select()
    .from(episodes)
    .where(eq(episodes.seasonId, seasonId))
    .all();

  const epIds = seasonEps.map((ep) => ep.id);
  if (epIds.length > 0) {
    db.delete(userEpisodeWatches)
      .where(
        and(
          eq(userEpisodeWatches.userId, userId),
          inArray(userEpisodeWatches.episodeId, epIds),
        ),
      )
      .run();
  }

  // Find parent title and downgrade from completed to in_progress
  const season = db
    .select()
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .get();
  if (!season) return;

  const existing = db
    .select()
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.titleId, season.titleId),
      ),
    )
    .get();

  if (existing?.status === "completed") {
    setTitleStatus(userId, season.titleId, "in_progress");
  }
}

export function rateTitleStars(
  userId: string,
  titleId: string,
  ratingStars: number,
) {
  const now = new Date();
  if (ratingStars === 0) {
    db.delete(userRatings)
      .where(
        and(eq(userRatings.userId, userId), eq(userRatings.titleId, titleId)),
      )
      .run();
    return;
  }
  db.insert(userRatings)
    .values({ userId, titleId, ratingStars, ratedAt: now })
    .onConflictDoUpdate({
      target: [userRatings.userId, userRatings.titleId],
      set: { ratingStars, ratedAt: now },
    })
    .run();
}

export function getUserStatusesByTmdbIds(
  userId: string,
  tmdbIds: { tmdbId: number; type: string }[],
): Record<string, "watchlist" | "in_progress" | "completed"> {
  if (tmdbIds.length === 0) return {};

  const allTmdbIds = tmdbIds.map((t) => t.tmdbId);
  const rows = db
    .select({
      tmdbId: titles.tmdbId,
      type: titles.type,
      status: userTitleStatus.status,
    })
    .from(userTitleStatus)
    .innerJoin(titles, eq(userTitleStatus.titleId, titles.id))
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        inArray(titles.tmdbId, allTmdbIds),
      ),
    )
    .all();

  const result: Record<string, "watchlist" | "in_progress" | "completed"> = {};
  for (const row of rows) {
    result[`${row.tmdbId}-${row.type}`] = row.status as
      | "watchlist"
      | "in_progress"
      | "completed";
  }
  return result;
}

export function getUserStatusesByTitleIds(
  userId: string,
  titleIds: string[],
): Record<string, "watchlist" | "in_progress" | "completed"> {
  if (titleIds.length === 0) return {};

  const rows = db
    .select({
      titleId: userTitleStatus.titleId,
      status: userTitleStatus.status,
    })
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        inArray(userTitleStatus.titleId, titleIds),
      ),
    )
    .all();

  const result: Record<string, "watchlist" | "in_progress" | "completed"> = {};
  for (const row of rows) {
    result[row.titleId] = row.status as
      | "watchlist"
      | "in_progress"
      | "completed";
  }
  return result;
}

export function getEpisodeProgressByTmdbIds(
  userId: string,
  tmdbIds: { tmdbId: number; type: string }[],
): Record<string, { watched: number; total: number }> {
  const tvIds = tmdbIds.filter((t) => t.type === "tv").map((t) => t.tmdbId);
  if (tvIds.length === 0) return {};

  const rows = db
    .select({
      tmdbId: titles.tmdbId,
      totalEpisodes: sql<number>`count(distinct ${episodes.id})`.as(
        "totalEpisodes",
      ),
      watchedEpisodes:
        sql<number>`count(distinct case when ${userEpisodeWatches.id} is not null then ${episodes.id} end)`.as(
          "watchedEpisodes",
        ),
    })
    .from(titles)
    .innerJoin(seasons, eq(seasons.titleId, titles.id))
    .innerJoin(episodes, eq(episodes.seasonId, seasons.id))
    .leftJoin(
      userEpisodeWatches,
      and(
        eq(userEpisodeWatches.episodeId, episodes.id),
        eq(userEpisodeWatches.userId, userId),
      ),
    )
    .where(and(inArray(titles.tmdbId, tvIds), eq(titles.type, "tv")))
    .groupBy(titles.tmdbId)
    .all();

  const result: Record<string, { watched: number; total: number }> = {};
  for (const row of rows) {
    if (row.watchedEpisodes > 0) {
      result[`${row.tmdbId}-tv`] = {
        watched: row.watchedEpisodes,
        total: row.totalEpisodes,
      };
    }
  }
  return result;
}

export function getUserTitleInfo(userId: string, titleId: string) {
  const status = db
    .select()
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.titleId, titleId),
      ),
    )
    .get();

  const rating = db
    .select()
    .from(userRatings)
    .where(
      and(eq(userRatings.userId, userId), eq(userRatings.titleId, titleId)),
    )
    .get();

  // Batch fetch all episode IDs for this title
  const titleSeasons = db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  const seasonIds = titleSeasons.map((s) => s.id);
  const allEps =
    seasonIds.length > 0
      ? db
          .select()
          .from(episodes)
          .where(inArray(episodes.seasonId, seasonIds))
          .all()
      : [];

  const epIds = allEps.map((ep) => ep.id);

  // Batch fetch all watches for these episodes
  const watchedEpisodeIds =
    epIds.length > 0
      ? Array.from(
          new Set(
            db
              .select({ episodeId: userEpisodeWatches.episodeId })
              .from(userEpisodeWatches)
              .where(
                and(
                  eq(userEpisodeWatches.userId, userId),
                  inArray(userEpisodeWatches.episodeId, epIds),
                ),
              )
              .all()
              .map((w) => w.episodeId),
          ),
        )
      : [];

  return {
    status: status?.status ?? null,
    rating: rating?.ratingStars ?? null,
    episodeWatches: watchedEpisodeIds,
  };
}
