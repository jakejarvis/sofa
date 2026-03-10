import { ORPCError } from "@orpc/server";
import { isTmdbConfigured } from "@/lib/config";
import {
  searchMovies,
  searchMulti,
  searchPerson,
  searchTv,
} from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { os } from "../context";
import { authed } from "../middleware";

export const search = os.search.use(authed).handler(async ({ input }) => {
  if (!isTmdbConfigured()) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "TMDB API key is not configured.",
    });
  }

  const query = input.query.trim();
  if (!query) {
    return { results: [] };
  }
  const type = input.type ?? null;

  if (type === "person") {
    const personResults = await searchPerson(query);
    return {
      results: (personResults.results ?? []).map((r) => ({
        tmdbId: r.id,
        type: "person" as const,
        title: r.name ?? "",
        posterPath: null,
        profilePath: tmdbImageUrl(r.profile_path ?? null, "profiles"),
        overview: "",
        releaseDate: null,
        popularity: r.popularity,
        voteAverage: 0,
        knownForDepartment: r.known_for_department,
        knownFor: r.known_for
          ?.slice(0, 3)
          .map((k) => k.title ?? (k as { name?: string }).name)
          .filter(Boolean) as string[] | undefined,
      })),
    };
  }

  const raw =
    type === "movie"
      ? await searchMovies(query)
      : type === "tv"
        ? await searchTv(query)
        : await searchMulti(query);

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
      if (r.media_type === "person") {
        return {
          tmdbId: r.id,
          type: "person" as const,
          title: r.name ?? "Unknown",
          posterPath: null,
          profilePath: tmdbImageUrl(r.profile_path ?? null, "profiles"),
          overview: "",
          releaseDate: null,
          popularity: r.popularity ?? 0,
          voteAverage: 0,
        };
      }

      const mediaType =
        r.media_type === "movie" || r.media_type === "tv" ? r.media_type : type;
      if (!mediaType) return null;

      return {
        tmdbId: r.id,
        type: mediaType,
        title: r.title ?? r.name ?? "",
        overview: r.overview ?? "",
        releaseDate: r.release_date ?? r.first_air_date ?? null,
        posterPath: tmdbImageUrl(r.poster_path ?? null, "posters"),
        popularity: r.popularity ?? 0,
        voteAverage: r.vote_average ?? 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return { results: mapped };
});
