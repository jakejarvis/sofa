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
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

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
        results: personResults.results.map((r) => ({
          tmdbId: r.id,
          type: "person" as const,
          title: r.name,
          profilePath: tmdbImageUrl(r.profile_path, "profiles"),
          knownForDepartment: r.known_for_department,
          knownFor: r.known_for
            ?.slice(0, 3)
            .map((k) => k.title ?? k.name)
            .filter(Boolean),
        })),
      });
    }

    let results: TmdbSearchResponse;
    if (type === "movie") {
      results = await searchMovies(query);
    } else if (type === "tv") {
      results = await searchTv(query);
    } else {
      results = await searchMulti(query);
    }

    const mapped = results.results
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
          posterPath: tmdbImageUrl(r.poster_path, "posters"),
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
