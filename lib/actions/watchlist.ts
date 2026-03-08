"use server";

import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { userTitleStatus } from "@/lib/db/schema";
import { getOrFetchTitleByTmdbId } from "@/lib/services/metadata";
import { setTitleStatus } from "@/lib/services/tracking";

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
