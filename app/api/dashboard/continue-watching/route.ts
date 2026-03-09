import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getContinueWatchingFeed } from "@/lib/services/discovery";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = getContinueWatchingFeed(session.user.id);
  const items = feed.map((item) => ({
    title: {
      id: item.title.id,
      title: item.title.title,
      backdropPath: tmdbImageUrl(item.title.backdropPath, "backdrops"),
    },
    nextEpisode: item.nextEpisode
      ? {
          seasonNumber: item.nextEpisode.seasonNumber,
          episodeNumber: item.nextEpisode.episodeNumber,
          name: item.nextEpisode.name,
          stillPath: tmdbImageUrl(item.nextEpisode.stillPath, "stills"),
        }
      : null,
    totalEpisodes: item.totalEpisodes,
    watchedEpisodes: item.watchedEpisodes,
  }));

  return NextResponse.json({ items });
}
