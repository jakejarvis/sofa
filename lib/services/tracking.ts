import { and, eq, inArray } from "drizzle-orm";
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

  for (const s of allSeasons) {
    const eps = db
      .select()
      .from(episodes)
      .where(eq(episodes.seasonId, s.id))
      .all();

    for (const ep of eps) {
      const existing = db
        .select()
        .from(userEpisodeWatches)
        .where(
          and(
            eq(userEpisodeWatches.userId, userId),
            eq(userEpisodeWatches.episodeId, ep.id),
          ),
        )
        .get();
      if (!existing) {
        db.insert(userEpisodeWatches)
          .values({
            userId,
            episodeId: ep.id,
            watchedAt: now,
            source,
          })
          .run();
      }
    }
  }

  setTitleStatus(userId, titleId, "completed", source);
}

function checkAllEpisodesWatched(userId: string, titleId: string) {
  const allSeasons = db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  let totalEpisodes = 0;
  let watchedEpisodes = 0;

  for (const s of allSeasons) {
    const eps = db
      .select()
      .from(episodes)
      .where(eq(episodes.seasonId, s.id))
      .all();
    totalEpisodes += eps.length;

    for (const ep of eps) {
      const watch = db
        .select()
        .from(userEpisodeWatches)
        .where(
          and(
            eq(userEpisodeWatches.userId, userId),
            eq(userEpisodeWatches.episodeId, ep.id),
          ),
        )
        .get();
      if (watch) watchedEpisodes++;
    }
  }

  if (totalEpisodes > 0 && watchedEpisodes >= totalEpisodes) {
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

  // Get watched episode IDs for this title
  const titleSeasons = db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  const watchedEpisodeIds: string[] = [];
  for (const s of titleSeasons) {
    const eps = db
      .select()
      .from(episodes)
      .where(eq(episodes.seasonId, s.id))
      .all();
    for (const ep of eps) {
      const watch = db
        .select()
        .from(userEpisodeWatches)
        .where(
          and(
            eq(userEpisodeWatches.userId, userId),
            eq(userEpisodeWatches.episodeId, ep.id),
          ),
        )
        .get();
      if (watch) watchedEpisodeIds.push(ep.id);
    }
  }

  return {
    status: status?.status ?? null,
    rating: rating?.ratingStars ?? null,
    episodeWatches: watchedEpisodeIds,
  };
}
