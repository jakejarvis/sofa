"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { episodes } from "@/lib/db/schema";
import {
  logEpisodeWatch,
  logEpisodeWatchBatch,
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
    removeTitleStatus(userId, titleId);
  } else {
    setTitleStatus(userId, titleId, status);
  }
}

export async function markAllWatchedAction(titleId: string) {
  const userId = await getSessionUserId();
  markAllEpisodesWatched(userId, titleId);
}

const ratingSchema = z.number().int().min(0).max(5);

export async function updateTitleRating(titleId: string, ratingStars: number) {
  const userId = await getSessionUserId();
  rateTitleStars(userId, titleId, ratingSchema.parse(ratingStars));
}

export async function watchMovie(titleId: string) {
  const userId = await getSessionUserId();
  logMovieWatch(userId, titleId);
}

export async function watchEpisode(episodeId: string) {
  const userId = await getSessionUserId();
  logEpisodeWatch(userId, episodeId);
}

export async function unwatchEpisodeAction(episodeId: string) {
  const userId = await getSessionUserId();
  unwatchEpisode(userId, episodeId);
}

export async function watchSeason(seasonId: string) {
  const userId = await getSessionUserId();
  const seasonEps = db
    .select()
    .from(episodes)
    .where(eq(episodes.seasonId, seasonId))
    .all();
  logEpisodeWatchBatch(
    userId,
    seasonEps.map((ep) => ep.id),
  );
}

export async function unwatchSeasonAction(seasonId: string) {
  const userId = await getSessionUserId();
  unwatchSeason(userId, seasonId);
}

export async function batchWatchEpisodes(episodeIds: string[]) {
  const userId = await getSessionUserId();
  logEpisodeWatchBatch(userId, episodeIds);
}
