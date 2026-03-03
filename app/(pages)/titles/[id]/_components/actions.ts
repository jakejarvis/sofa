"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { episodes } from "@/lib/db/schema";
import {
  logEpisodeWatch,
  logMovieWatch,
  markAllEpisodesWatched,
  rateTitleStars,
  removeTitleStatus,
  setTitleStatus,
  unwatchEpisode,
  unwatchSeason,
} from "@/lib/services/tracking";

async function getSessionUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function updateTitleStatus(
  titleId: string,
  status: "in_progress" | null,
) {
  const userId = await getSessionUserId();
  if (status === null) {
    await removeTitleStatus(userId, titleId);
  } else {
    await setTitleStatus(userId, titleId, status);
  }
}

export async function markAllWatchedAction(titleId: string) {
  const userId = await getSessionUserId();
  await markAllEpisodesWatched(userId, titleId);
}

export async function updateTitleRating(titleId: string, ratingStars: number) {
  const userId = await getSessionUserId();
  if (ratingStars < 0 || ratingStars > 5) throw new Error("Invalid rating");
  await rateTitleStars(userId, titleId, ratingStars);
}

export async function watchMovie(titleId: string) {
  const userId = await getSessionUserId();
  await logMovieWatch(userId, titleId);
}

export async function watchEpisode(episodeId: string) {
  const userId = await getSessionUserId();
  await logEpisodeWatch(userId, episodeId);
}

export async function unwatchEpisodeAction(episodeId: string) {
  const userId = await getSessionUserId();
  await unwatchEpisode(userId, episodeId);
}

export async function watchSeason(seasonId: string) {
  const userId = await getSessionUserId();
  const seasonEps = await db
    .select()
    .from(episodes)
    .where(eq(episodes.seasonId, seasonId))
    .all();
  for (const ep of seasonEps) {
    await logEpisodeWatch(userId, ep.id);
  }
}

export async function unwatchSeasonAction(seasonId: string) {
  const userId = await getSessionUserId();
  await unwatchSeason(userId, seasonId);
}

export async function batchWatchEpisodes(episodeIds: string[]) {
  const userId = await getSessionUserId();
  for (const id of episodeIds) {
    await logEpisodeWatch(userId, id);
  }
}
