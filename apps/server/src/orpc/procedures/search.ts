import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import { ensureBrowseTitlesExist } from "@sofa/core/metadata";
import { ensureBrowsePersonsExist } from "@sofa/core/person";
import { searchMovies, searchMulti, searchPerson, searchTv } from "@sofa/tmdb/client";
import { isTmdbConfigured } from "@sofa/tmdb/config";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { os } from "../context";
import { authed } from "../middleware";

export const search = os.search.use(authed).handler(async ({ input }) => {
  if (!isTmdbConfigured()) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "TMDB API key is not configured",
      data: { code: AppErrorCode.TMDB_NOT_CONFIGURED },
    });
  }

  const query = input.query.trim();
  if (!query) {
    return { results: [], page: 1, totalPages: 0, totalResults: 0 };
  }
  const type = input.type ?? null;

  if (type === "person") {
    const personResults = await searchPerson(query, input.page);
    const personItems = (personResults.results ?? []).map((r) => ({
      tmdbId: r.id,
      type: "person" as const,
      title: r.name ?? "",
      posterPath: null,
      profilePath: tmdbImageUrl(r.profile_path ?? null, "profiles"),
      overview: null,
      releaseDate: null,
      popularity: r.popularity ?? null,
      voteAverage: null,
      knownForDepartment: r.known_for_department ?? null,
      knownFor:
        (r.known_for
          ?.slice(0, 3)
          .map((k) => k.title ?? (k as { name?: string }).name)
          .filter((s): s is string => !!s) as string[]) ?? null,
    }));
    const personMap = ensureBrowsePersonsExist(
      personItems.map((r) => ({
        tmdbId: r.tmdbId,
        name: r.title,
        profilePath: r.profilePath,
        knownForDepartment: r.knownForDepartment,
        popularity: r.popularity,
      })),
    );
    return {
      results: personItems.map((r) => Object.assign(r, { id: personMap.get(r.tmdbId) })),
      page: personResults.page ?? input.page,
      totalPages: personResults.total_pages ?? 1,
      totalResults: personResults.total_results ?? 0,
    };
  }

  const raw =
    type === "movie"
      ? await searchMovies(query, input.page)
      : type === "tv"
        ? await searchTv(query, input.page)
        : await searchMulti(query, input.page);

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
          overview: null,
          releaseDate: null,
          popularity: r.popularity ?? null,
          voteAverage: null,
          knownForDepartment: null,
          knownFor: null,
        };
      }

      const mediaType = r.media_type === "movie" || r.media_type === "tv" ? r.media_type : type;
      if (!mediaType) return null;

      return {
        tmdbId: r.id,
        type: mediaType,
        title: r.title ?? r.name ?? "",
        overview: r.overview ?? null,
        releaseDate: r.release_date ?? r.first_air_date ?? null,
        posterPath: tmdbImageUrl(r.poster_path ?? null, "posters"),
        profilePath: null,
        popularity: r.popularity ?? null,
        voteAverage: r.vote_average ?? null,
        knownForDepartment: null,
        knownFor: null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Batch-import movie/TV results so they have internal IDs
  const titleResults = mapped.filter(
    (r): r is typeof r & { type: "movie" | "tv" } => r.type !== "person",
  );
  const titleMap = ensureBrowseTitlesExist(titleResults);

  // Batch-import person results so they have internal IDs
  const personResults = mapped.filter((r) => r.type === "person");
  const personMap = ensureBrowsePersonsExist(
    personResults.map((r) => ({
      tmdbId: r.tmdbId,
      name: r.title,
      profilePath: r.profilePath,
      knownForDepartment: r.knownForDepartment,
      popularity: r.popularity,
    })),
  );

  const results = mapped.map((r) => {
    if (r.type === "person") return Object.assign(r, { id: personMap.get(r.tmdbId) });
    const entry = titleMap.get(`${r.tmdbId}-${r.type}`);
    return Object.assign(r, { id: entry?.id });
  });

  return {
    results,
    page: raw.page ?? input.page,
    totalPages: raw.total_pages ?? 1,
    totalResults: raw.total_results ?? 0,
  };
});
