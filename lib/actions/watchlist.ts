"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getSession, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { userTitleStatus } from "@/lib/db/schema";
import {
  getWatchCount,
  getWatchHistory,
  type HistoryBucket,
  type TimePeriod,
} from "@/lib/services/discovery";
import { getOrFetchTitleByTmdbId } from "@/lib/services/metadata";
import {
  getEpisodeProgressByTmdbIds,
  getUserStatusesByTmdbIds,
  setTitleStatus,
} from "@/lib/services/tracking";

export async function fetchUserStatuses(
  tmdbIds: { tmdbId: number; type: string }[],
): Promise<Record<string, "watchlist" | "in_progress" | "completed">> {
  const session = await getSession();
  if (!session) return {};
  return getUserStatusesByTmdbIds(session.user.id, tmdbIds);
}

export async function fetchEpisodeProgress(
  tmdbIds: { tmdbId: number; type: string }[],
): Promise<Record<string, { watched: number; total: number }>> {
  const session = await getSession();
  if (!session) return {};
  return getEpisodeProgressByTmdbIds(session.user.id, tmdbIds);
}

export async function quickAddToWatchlist(
  tmdbId: number,
  type: "movie" | "tv",
) {
  const session = await requireSession();
  const userId = session.user.id;

  const title = await getOrFetchTitleByTmdbId(tmdbId, type);
  if (!title) throw new Error("Failed to import title");

  const existing = db
    .select()
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.titleId, title.id),
      ),
    )
    .get();

  if (existing) {
    return { success: true, titleId: title.id, alreadyAdded: true };
  }

  setTitleStatus(userId, title.id, "watchlist");
  return { success: true, titleId: title.id, alreadyAdded: false };
}

const statsSchema = z.object({
  type: z.enum(["movies", "episodes"]),
  period: z.enum(["today", "this_week", "this_month", "this_year"]),
});

export async function getStatsAction(
  type: "movies" | "episodes",
  period: TimePeriod,
): Promise<{ count: number; history: HistoryBucket[] }> {
  const session = await requireSession();
  const parsed = statsSchema.parse({ type, period });
  const count = getWatchCount(session.user.id, parsed.type, parsed.period);
  const history = getWatchHistory(session.user.id, parsed.type, parsed.period);
  return { count, history };
}
