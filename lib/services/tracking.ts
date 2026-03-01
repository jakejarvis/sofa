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

export async function setTitleStatus(
  userId: string,
  titleId: string,
  status: "watchlist" | "in_progress" | "completed",
) {
  const now = new Date();
  await db
    .insert(userTitleStatus)
    .values({ userId, titleId, status, addedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [userTitleStatus.userId, userTitleStatus.titleId],
      set: { status, updatedAt: now },
    })
    .run();

  if (status === "completed") {
    await markAllEpisodesWatched(userId, titleId);
  }
}

export async function removeTitleStatus(userId: string, titleId: string) {
  await db
    .delete(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.titleId, titleId),
      ),
    )
    .run();
}

export async function logMovieWatch(userId: string, titleId: string) {
  const now = new Date();
  await db
    .insert(userMovieWatches)
    .values({ userId, titleId, watchedAt: now, source: "manual" })
    .run();

  // Auto-set status to completed
  const existing = await db
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
    await setTitleStatus(userId, titleId, "completed");
  } else if (existing.status !== "completed") {
    await setTitleStatus(userId, titleId, "completed");
  }
}

export async function logEpisodeWatch(userId: string, episodeId: string) {
  const now = new Date();
  await db
    .insert(userEpisodeWatches)
    .values({ userId, episodeId, watchedAt: now, source: "manual" })
    .run();

  // Find the title for this episode
  const ep = await db
    .select()
    .from(episodes)
    .where(eq(episodes.id, episodeId))
    .get();
  if (!ep) return;
  const season = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, ep.seasonId))
    .get();
  if (!season) return;
  const titleId = season.titleId;

  // Auto-set status to in_progress if not set
  const existing = await db
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
    await setTitleStatus(userId, titleId, "in_progress");
  }

  // Check if all episodes are watched -> auto-complete
  await checkAllEpisodesWatched(userId, titleId);
}

async function markAllEpisodesWatched(userId: string, titleId: string) {
  const title = await db
    .select()
    .from(titles)
    .where(eq(titles.id, titleId))
    .get();
  if (!title || title.type !== "tv") return;

  const now = new Date();
  const allSeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  for (const s of allSeasons) {
    const eps = await db
      .select()
      .from(episodes)
      .where(eq(episodes.seasonId, s.id))
      .all();

    for (const ep of eps) {
      const existing = await db
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
        await db
          .insert(userEpisodeWatches)
          .values({
            userId,
            episodeId: ep.id,
            watchedAt: now,
            source: "manual",
          })
          .run();
      }
    }
  }
}

async function checkAllEpisodesWatched(userId: string, titleId: string) {
  const allSeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  let totalEpisodes = 0;
  let watchedEpisodes = 0;

  for (const s of allSeasons) {
    const eps = await db
      .select()
      .from(episodes)
      .where(eq(episodes.seasonId, s.id))
      .all();
    totalEpisodes += eps.length;

    for (const ep of eps) {
      const watch = await db
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
    await setTitleStatus(userId, titleId, "completed");
  }
}

export async function unwatchEpisode(userId: string, episodeId: string) {
  await db
    .delete(userEpisodeWatches)
    .where(
      and(
        eq(userEpisodeWatches.userId, userId),
        eq(userEpisodeWatches.episodeId, episodeId),
      ),
    )
    .run();

  // Find parent title and downgrade from completed to in_progress
  const ep = await db
    .select()
    .from(episodes)
    .where(eq(episodes.id, episodeId))
    .get();
  if (!ep) return;
  const season = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, ep.seasonId))
    .get();
  if (!season) return;

  const existing = await db
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
    await setTitleStatus(userId, season.titleId, "in_progress");
  }
}

export async function unwatchSeason(userId: string, seasonId: string) {
  const seasonEps = await db
    .select()
    .from(episodes)
    .where(eq(episodes.seasonId, seasonId))
    .all();

  const epIds = seasonEps.map((ep) => ep.id);
  if (epIds.length > 0) {
    await db
      .delete(userEpisodeWatches)
      .where(
        and(
          eq(userEpisodeWatches.userId, userId),
          inArray(userEpisodeWatches.episodeId, epIds),
        ),
      )
      .run();
  }

  // Find parent title and downgrade from completed to in_progress
  const season = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .get();
  if (!season) return;

  const existing = await db
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
    await setTitleStatus(userId, season.titleId, "in_progress");
  }
}

export async function rateTitleStars(
  userId: string,
  titleId: string,
  ratingStars: number,
) {
  const now = new Date();
  if (ratingStars === 0) {
    await db
      .delete(userRatings)
      .where(
        and(eq(userRatings.userId, userId), eq(userRatings.titleId, titleId)),
      )
      .run();
    return;
  }
  await db
    .insert(userRatings)
    .values({ userId, titleId, ratingStars, ratedAt: now })
    .onConflictDoUpdate({
      target: [userRatings.userId, userRatings.titleId],
      set: { ratingStars, ratedAt: now },
    })
    .run();
}

export async function getUserTitleInfo(userId: string, titleId: string) {
  const status = await db
    .select()
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.titleId, titleId),
      ),
    )
    .get();

  const rating = await db
    .select()
    .from(userRatings)
    .where(
      and(eq(userRatings.userId, userId), eq(userRatings.titleId, titleId)),
    )
    .get();

  // Get watched episode IDs for this title
  const titleSeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  const watchedEpisodeIds: string[] = [];
  for (const s of titleSeasons) {
    const eps = await db
      .select()
      .from(episodes)
      .where(eq(episodes.seasonId, s.id))
      .all();
    for (const ep of eps) {
      const watch = await db
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
