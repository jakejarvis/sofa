"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { userTitleStatus } from "@/lib/db/schema";
import { importTitle } from "@/lib/services/metadata";
import {
  getUserStatusesByTmdbIds,
  setTitleStatus,
} from "@/lib/services/tracking";

export async function fetchUserStatuses(
  tmdbIds: { tmdbId: number; type: string }[],
): Promise<Record<string, "watchlist" | "in_progress" | "completed">> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return {};
  return getUserStatusesByTmdbIds(session.user.id, tmdbIds);
}

export async function quickAddToWatchlist(
  tmdbId: number,
  type: "movie" | "tv",
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id;

  const title = await importTitle(tmdbId, type);
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
