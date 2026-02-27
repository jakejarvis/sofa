import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  episodes,
  seasons,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "@/lib/db/schema";

export function setTitleStatus(
  userId: string,
  titleId: string,
  status: "watchlist" | "in_progress" | "completed",
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

export function logMovieWatch(userId: string, titleId: string) {
  const now = new Date();
  db.insert(userMovieWatches)
    .values({ userId, titleId, watchedAt: now, source: "manual" })
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
    setTitleStatus(userId, titleId, "completed");
  } else if (existing.status !== "completed") {
    setTitleStatus(userId, titleId, "completed");
  }
}

export function logEpisodeWatch(userId: string, episodeId: string) {
  const now = new Date();
  db.insert(userEpisodeWatches)
    .values({ userId, episodeId, watchedAt: now, source: "manual" })
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
    setTitleStatus(userId, titleId, "in_progress");
  }

  // Check if all episodes are watched -> auto-complete
  checkAllEpisodesWatched(userId, titleId);
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
