import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getContinueWatchingFeed } from "@/lib/services/discovery";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = await getContinueWatchingFeed(session.user.id);
  return NextResponse.json(
    feed.map((item) => ({
      ...item,
      title: {
        ...item.title,
        posterPath: tmdbImageUrl(item.title.posterPath, "w500"),
        backdropPath: tmdbImageUrl(item.title.backdropPath, "w1280"),
      },
      nextEpisode: item.nextEpisode
        ? {
            ...item.nextEpisode,
            stillPath: tmdbImageUrl(
              item.nextEpisode.stillPath,
              "w1280",
              "stills",
            ),
          }
        : null,
    })),
  );
}
