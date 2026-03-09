import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getRecommendationsFeed } from "@/lib/services/discovery";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = getRecommendationsFeed(session.user.id);
  const items = feed
    .filter((t): t is NonNullable<typeof t> => t != null)
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      tmdbId: t.tmdbId,
      type: t.type,
      title: t.title,
      posterPath: tmdbImageUrl(t.posterPath, "posters"),
      releaseDate: t.releaseDate ?? t.firstAirDate ?? null,
      voteAverage: t.voteAverage,
    }));

  return NextResponse.json({ items });
}
