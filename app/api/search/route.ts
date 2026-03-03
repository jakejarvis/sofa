import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { isTmdbConfigured } from "@/lib/config";
import { searchMovies, searchMulti, searchTv } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTmdbConfigured()) {
    return NextResponse.json(
      {
        error: "TMDB API key is not configured. Visit /setup for instructions.",
        code: "TMDB_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const query = req.nextUrl.searchParams.get("query");
  const type = req.nextUrl.searchParams.get("type");

  if (!query)
    return NextResponse.json(
      { error: "query parameter is required" },
      { status: 400 },
    );

  let results: TmdbSearchResponse;
  if (type === "movie") {
    results = await searchMovies(query);
  } else if (type === "tv") {
    results = await searchTv(query);
  } else {
    results = await searchMulti(query);
  }

  // Filter out person results from multi search
  const filtered = results.results.filter(
    (r) => r.media_type !== "person" || type,
  );

  return NextResponse.json({
    results: filtered.map((r) => ({
      tmdbId: r.id,
      type: r.media_type ?? type,
      title: r.title ?? r.name,
      overview: r.overview,
      releaseDate: r.release_date ?? r.first_air_date,
      posterPath: tmdbImageUrl(r.poster_path, "w500"),
      popularity: r.popularity,
      voteAverage: r.vote_average,
    })),
  });
}
