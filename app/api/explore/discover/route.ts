import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { isTmdbConfigured } from "@/lib/config";
import { discover } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";

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

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const genre = searchParams.get("genre");
  const sortBy = searchParams.get("sort_by") || "popularity.desc";
  const page = searchParams.get("page") || "1";

  const params: Record<string, string> = {
    sort_by: sortBy,
    "vote_count.gte": "50",
  };
  if (genre) {
    params.with_genres = genre;
  }

  const results = await discover(type, params, Number(page));

  const filtered = results.results.filter((r) => r.poster_path);

  return NextResponse.json({
    results: filtered.map((r) => ({
      tmdbId: r.id,
      type,
      title: r.title ?? r.name,
      overview: r.overview,
      releaseDate: r.release_date ?? r.first_air_date,
      posterPath: tmdbImageUrl(r.poster_path, "w500"),
      popularity: r.popularity,
      voteAverage: r.vote_average,
    })),
    page: results.page,
    totalPages: results.total_pages,
  });
}
