import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getRecommendationsFeed } from "@/lib/services/discovery";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = await getRecommendationsFeed(session.user.id);
  return NextResponse.json(
    feed
      .filter((item) => !!item)
      .map((item) => ({
        ...item,
        posterPath: tmdbImageUrl(item.posterPath, "w500"),
        backdropPath: tmdbImageUrl(item.backdropPath, "w1280"),
      })),
  );
}
