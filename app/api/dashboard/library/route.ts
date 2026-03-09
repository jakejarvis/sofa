import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getNewAvailableFeed } from "@/lib/services/discovery";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = getNewAvailableFeed(session.user.id);
  const items = feed.slice(0, 10).map((t) => ({
    id: t.titleId,
    tmdbId: t.tmdbId,
    type: t.type,
    title: t.title,
    posterPath: tmdbImageUrl(t.posterPath, "posters"),
    releaseDate: t.releaseDate ?? t.firstAirDate ?? null,
    voteAverage: t.voteAverage,
    userStatus: t.userStatus,
  }));

  return NextResponse.json({ items });
}
