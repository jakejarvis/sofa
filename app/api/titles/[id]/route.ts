import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { availabilityOffers, episodes, seasons, titles } from "@/lib/db/schema";
import { refreshTvChildren } from "@/lib/services/metadata";
import { getTvDetails } from "@/lib/tmdb/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let title = await db.select().from(titles).where(eq(titles.id, id)).get();
  if (!title)
    return NextResponse.json({ error: "Title not found" }, { status: 404 });

  // If this is a shell TV title (created by recommendations with no episode data),
  // fetch the full details and episodes now.
  if (title.type === "tv" && !title.lastFetchedAt) {
    try {
      const show = await getTvDetails(title.tmdbId);
      await db
        .update(titles)
        .set({
          overview: show.overview,
          posterPath: show.poster_path,
          backdropPath: show.backdrop_path,
          status: show.status,
          lastFetchedAt: new Date(),
        })
        .where(eq(titles.id, id))
        .run();
      await refreshTvChildren(id, title.tmdbId, show.number_of_seasons);
      title =
        (await db.select().from(titles).where(eq(titles.id, id)).get()) ??
        title;
    } catch {
      // Continue with whatever data we have
    }
  }

  let titleSeasons: Array<{
    id: string;
    seasonNumber: number;
    name: string | null;
    overview: string | null;
    posterPath: string | null;
    airDate: string | null;
    episodes: Array<{
      id: string;
      episodeNumber: number;
      name: string | null;
      overview: string | null;
      stillPath: string | null;
      airDate: string | null;
      runtimeMinutes: number | null;
    }>;
  }> = [];

  if (title.type === "tv") {
    const seasonRows = await db
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, title.id))
      .orderBy(seasons.seasonNumber)
      .all();

    titleSeasons = await Promise.all(
      seasonRows.map(async (s) => ({
        ...s,
        episodes: await db
          .select()
          .from(episodes)
          .where(eq(episodes.seasonId, s.id))
          .orderBy(episodes.episodeNumber)
          .all(),
      })),
    );
  }

  const availability = await db
    .select()
    .from(availabilityOffers)
    .where(eq(availabilityOffers.titleId, title.id))
    .all();

  return NextResponse.json({
    ...title,
    seasons: titleSeasons,
    availability,
  });
}
