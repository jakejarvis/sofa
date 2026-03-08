import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isTmdbConfigured } from "@/lib/config";
import {
  searchMovies,
  searchMulti,
  searchPerson,
  searchTv,
} from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET(req: NextRequest) {
  const session = await getSession();
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

  const query = req.nextUrl.searchParams.get("query")?.trim();
  const rawType = req.nextUrl.searchParams.get("type");
  const type: "movie" | "tv" | "person" | null =
    rawType === "movie" || rawType === "tv" || rawType === "person"
      ? rawType
      : null;

  if (rawType && !type) {
    return NextResponse.json(
      { error: "type must be movie, tv, or person" },
      { status: 400 },
    );
  }

  if (!query)
    return NextResponse.json(
      { error: "query parameter is required" },
      { status: 400 },
    );

  try {
    // Person-specific search
    if (type === "person") {
      const personResults = await searchPerson(query);
      return NextResponse.json({
        results: (personResults.results ?? []).map((r) => ({
          tmdbId: r.id,
          type: "person" as const,
          title: r.name,
          profilePath: tmdbImageUrl(r.profile_path ?? null, "profiles"),
          knownForDepartment: r.known_for_department,
          knownFor: r.known_for
            ?.slice(0, 3)
            .map((k) => k.title ?? (k as { name?: string }).name)
            .filter(Boolean),
        })),
      });
    }

    const raw =
      type === "movie"
        ? await searchMovies(query)
        : type === "tv"
          ? await searchTv(query)
          : await searchMulti(query);

    // Search endpoints return movie, TV, or multi results with slightly
    // different fields. Widen to the union we actually access.
    type SearchResult = {
      id: number;
      media_type?: string;
      title?: string;
      name?: string;
      overview?: string;
      poster_path?: string | null;
      profile_path?: string | null;
      release_date?: string;
      first_air_date?: string;
      popularity?: number;
      vote_average?: number;
    };
    const mapped = ((raw.results ?? []) as SearchResult[])
      .map((r) => {
        // Include person results from multi search
        if (r.media_type === "person") {
          return {
            tmdbId: r.id,
            type: "person" as const,
            title: r.name ?? "Unknown",
            posterPath: null,
            profilePath: tmdbImageUrl(r.profile_path ?? null, "profiles"),
            overview: "",
            releaseDate: null,
            popularity: r.popularity,
            voteAverage: 0,
          };
        }

        const mediaType =
          r.media_type === "movie" || r.media_type === "tv"
            ? r.media_type
            : type;
        if (!mediaType) return null;

        return {
          tmdbId: r.id,
          type: mediaType,
          title: r.title ?? r.name,
          overview: r.overview,
          releaseDate: r.release_date ?? r.first_air_date,
          posterPath: tmdbImageUrl(r.poster_path ?? null, "posters"),
          popularity: r.popularity,
          voteAverage: r.vote_average,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json({ results: mapped });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch search results" },
      { status: 502 },
    );
  }
}
