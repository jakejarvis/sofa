import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import {
  userEpisodeWatches,
  userMovieWatches,
  userTitleStatus,
} from "@/lib/db/schema";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  // Start of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  // Start of current week (Monday)
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setHours(0, 0, 0, 0);

  const [moviesThisMonth] = db
    .select({ count: sql<number>`count(*)` })
    .from(userMovieWatches)
    .where(
      and(
        eq(userMovieWatches.userId, userId),
        sql`${userMovieWatches.watchedAt} >= ${Math.floor(monthStart.getTime() / 1000)}`,
      ),
    )
    .all();

  const [episodesThisWeek] = db
    .select({ count: sql<number>`count(*)` })
    .from(userEpisodeWatches)
    .where(
      and(
        eq(userEpisodeWatches.userId, userId),
        sql`${userEpisodeWatches.watchedAt} >= ${Math.floor(weekStart.getTime() / 1000)}`,
      ),
    )
    .all();

  const [librarySize] = db
    .select({ count: sql<number>`count(*)` })
    .from(userTitleStatus)
    .where(eq(userTitleStatus.userId, userId))
    .all();

  const [completedCount] = db
    .select({ count: sql<number>`count(*)` })
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.status, "completed"),
      ),
    )
    .all();

  return NextResponse.json({
    moviesThisMonth: moviesThisMonth?.count ?? 0,
    episodesThisWeek: episodesThisWeek?.count ?? 0,
    librarySize: librarySize?.count ?? 0,
    completed: completedCount?.count ?? 0,
  });
}
