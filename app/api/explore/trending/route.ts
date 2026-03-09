import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isTmdbConfigured } from "@/lib/config";
import {
  getEpisodeProgressByTmdbIds,
  getUserStatusesByTmdbIds,
} from "@/lib/services/tracking";
import { getTrending } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isTmdbConfigured())
    return NextResponse.json(
      { error: "TMDB API key is not configured." },
      { status: 503 },
    );

  const type =
    (req.nextUrl.searchParams.get("type") as "all" | "movie" | "tv") ?? "all";
  const window =
    (req.nextUrl.searchParams.get("window") as "day" | "week") ?? "day";

  const data = await getTrending(type, window);
  const results = (data.results ?? []) as Record<string, unknown>[];

  const items = results
    .filter((r) => r.poster_path)
    .map((r) => {
      const mediaType =
        r.media_type === "movie" || r.media_type === "tv"
          ? r.media_type
          : "movie";
      return {
        tmdbId: r.id as number,
        type: mediaType as "movie" | "tv",
        title: ((r.title ?? r.name) as string) || "",
        posterPath: tmdbImageUrl((r.poster_path as string) ?? null, "posters"),
        releaseDate: ((r.release_date ?? r.first_air_date) as string) ?? null,
        voteAverage: r.vote_average as number,
      };
    });

  // Find a hero title with a backdrop
  const heroResult = results.find(
    (r) =>
      r.backdrop_path && (r.media_type === "movie" || r.media_type === "tv"),
  );
  const hero = heroResult
    ? {
        tmdbId: heroResult.id as number,
        type: heroResult.media_type as "movie" | "tv",
        title:
          ((heroResult.title ?? heroResult.name) as string | undefined) ?? "",
        overview: (heroResult.overview as string | undefined) ?? "",
        backdropPath: tmdbImageUrl(
          (heroResult.backdrop_path as string) ?? null,
          "backdrops",
        ),
        voteAverage: heroResult.vote_average as number,
      }
    : null;

  const lookups = items.map((r) => ({ tmdbId: r.tmdbId, type: r.type }));
  const [userStatuses, episodeProgress] =
    lookups.length > 0
      ? [
          getUserStatusesByTmdbIds(session.user.id, lookups),
          getEpisodeProgressByTmdbIds(session.user.id, lookups),
        ]
      : [{}, {}];

  return NextResponse.json({ items, hero, userStatuses, episodeProgress });
}
