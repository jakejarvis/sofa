import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { availabilityOffers, episodes, seasons, titles } from "@/lib/db/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const title = db.select().from(titles).where(eq(titles.id, id)).get();
  if (!title)
    return NextResponse.json({ error: "Title not found" }, { status: 404 });

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
    const seasonRows = db
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, title.id))
      .orderBy(seasons.seasonNumber)
      .all();

    titleSeasons = seasonRows.map((s) => ({
      ...s,
      episodes: db
        .select()
        .from(episodes)
        .where(eq(episodes.seasonId, s.id))
        .orderBy(episodes.episodeNumber)
        .all(),
    }));
  }

  const availability = db
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
