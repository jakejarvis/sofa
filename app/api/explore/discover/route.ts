import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { isTmdbConfigured } from "@/lib/config";
import { discover } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";

const querySchema = z.object({
  type: z.enum(["movie", "tv"]).default("movie"),
  sort_by: z
    .string()
    .regex(/^[a-z_]+\.(asc|desc)$/)
    .default("popularity.desc"),
  genre: z
    .string()
    .regex(/^\d+(,\d+)*$/)
    .optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

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

  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const result = querySchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const { type, sort_by, genre, page } = result.data;

  const params: Record<string, string> = {
    sort_by,
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
