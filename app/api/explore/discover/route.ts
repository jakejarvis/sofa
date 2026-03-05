import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { isTmdbConfigured } from "@/lib/config";
import { discover } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";

const SORT_BY_PATTERN = /^[a-z_]+\.(asc|desc)$/;
const MAX_PAGE = 500;

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
  const rawType = searchParams.get("type");
  if (rawType && rawType !== "movie" && rawType !== "tv") {
    return NextResponse.json(
      { error: "type must be movie or tv" },
      { status: 400 },
    );
  }
  const type = rawType === "tv" ? "tv" : "movie";
  const genre = searchParams.get("genre");
  const sortBy = searchParams.get("sort_by") || "popularity.desc";
  const pageRaw = searchParams.get("page") || "1";
  const page = Number.parseInt(pageRaw, 10);

  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    return NextResponse.json(
      { error: `page must be an integer between 1 and ${MAX_PAGE}` },
      { status: 400 },
    );
  }

  if (!SORT_BY_PATTERN.test(sortBy)) {
    return NextResponse.json(
      { error: "Invalid sort_by value" },
      { status: 400 },
    );
  }

  if (genre && !/^\d+(,\d+)*$/.test(genre)) {
    return NextResponse.json({ error: "Invalid genre value" }, { status: 400 });
  }

  const params: Record<string, string> = {
    sort_by: sortBy,
    "vote_count.gte": "50",
  };
  if (genre) {
    params.with_genres = genre;
  }

  let results: Awaited<ReturnType<typeof discover>>;
  try {
    results = await discover(type, params, page);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch discover results" },
      { status: 502 },
    );
  }

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
