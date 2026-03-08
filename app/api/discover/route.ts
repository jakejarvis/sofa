import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isTmdbConfigured } from "@/lib/config";
import {
  getEpisodeProgressByTmdbIds,
  getUserStatusesByTmdbIds,
} from "@/lib/services/tracking";
import { discover } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: "TMDB API key is not configured." },
      { status: 503 },
    );
  }

  const mediaType = req.nextUrl.searchParams.get("mediaType");
  const genreId = req.nextUrl.searchParams.get("genreId");

  if (mediaType !== "movie" && mediaType !== "tv") {
    return NextResponse.json(
      { error: "mediaType must be movie or tv" },
      { status: 400 },
    );
  }

  const parsedGenreId = Number(genreId);
  if (!genreId || !Number.isFinite(parsedGenreId)) {
    return NextResponse.json(
      { error: "genreId must be a number" },
      { status: 400 },
    );
  }

  try {
    const results = await discover(mediaType, {
      sort_by: "popularity.desc",
      "vote_count.gte": "50",
      with_genres: String(parsedGenreId),
    });

    type DiscoverResult = NonNullable<typeof results.results>[number] & {
      title?: string;
      name?: string;
      release_date?: string;
      first_air_date?: string;
    };

    const items = ((results.results ?? []) as DiscoverResult[])
      .filter((r) => r.poster_path)
      .map((r) => ({
        tmdbId: r.id,
        type: mediaType,
        title: r.title ?? r.name ?? "",
        posterPath: tmdbImageUrl(r.poster_path ?? null, "posters"),
        releaseDate: r.release_date ?? r.first_air_date ?? null,
        voteAverage: r.vote_average,
      }));

    const lookups = items.map((r) => ({ tmdbId: r.tmdbId, type: r.type }));
    const [userStatuses, episodeProgress] =
      lookups.length > 0
        ? await Promise.all([
            getUserStatusesByTmdbIds(session.user.id, lookups),
            getEpisodeProgressByTmdbIds(session.user.id, lookups),
          ])
        : [{}, {}];

    return NextResponse.json({ items, userStatuses, episodeProgress });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch discover results" },
      { status: 502 },
    );
  }
}
