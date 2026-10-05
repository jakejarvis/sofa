import { ORPCError } from "@orpc/server";
import type { z } from "zod";

import { AppErrorCode } from "@sofa/api/errors";
import type { DiscoverInput } from "@sofa/api/schemas";
import { WATCH_REGION } from "@sofa/config";
import {
  discover,
  getGenres,
  getPopular,
  getTrending,
  searchMovies,
  searchMulti,
  searchPerson,
  searchTv,
} from "@sofa/tmdb/client";
import { isTmdbConfigured } from "@sofa/tmdb/config";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { ensureBrowseTitlesExist } from "./metadata";
import { ensureBrowsePersonsExist } from "./person";
import { getPlatformTmdbIds } from "./platforms";
import { getDisplayStatusesByTitleIds, getEpisodeProgressByTitleIds } from "./tracking";

// ─── Paging helpers ───────────────────────────────────────────

/** TMDB rejects page > 500 (and our PageParam caps at 500). */
export const TMDB_MAX_PAGE = 500;

export function clampTotalPages(totalPages: number | undefined): number {
  return Math.min(totalPages ?? 1, TMDB_MAX_PAGE);
}

/** TMDB's /discover/tv sorts by first_air_date where /discover/movie uses primary_release_date. */
export function tmdbSortBy(type: "movie" | "tv", sortBy: string | undefined): string {
  const value = sortBy ?? "popularity.desc";
  if (type === "tv" && value.startsWith("primary_release_date.")) {
    return value.replace("primary_release_date.", "first_air_date.");
  }
  return value;
}

// ─── Shared types ─────────────────────────────────────────────

type MediaType = "movie" | "tv";

/** The subset of a TMDB list/search result the browse endpoints read. */
export type TmdbListResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
  vote_average?: number;
};

type TmdbPage = {
  page?: number;
  total_pages?: number;
  total_results?: number;
  results?: unknown[];
};

type BrowseItem = {
  tmdbId: number;
  type: MediaType;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  voteAverage: number | null;
};

type DiscoverFilters = z.infer<typeof DiscoverInput>;

export function assertTmdbConfigured(): void {
  if (!isTmdbConfigured()) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "TMDB API key is not configured",
      data: { code: AppErrorCode.TMDB_NOT_CONFIGURED },
    });
  }
}

function listResults(data: TmdbPage): TmdbListResult[] {
  return (data.results ?? []) as TmdbListResult[];
}

function pagingOf(data: TmdbPage, requestedPage: number) {
  return {
    page: data.page ?? requestedPage,
    totalPages: clampTotalPages(data.total_pages),
    totalResults: data.total_results ?? 0,
  };
}

function isMediaType(value: string | undefined): value is MediaType {
  return value === "movie" || value === "tv";
}

export function toBrowseItem(r: TmdbListResult, type: MediaType): BrowseItem {
  return {
    tmdbId: r.id,
    type,
    title: (r.title ?? r.name) || "",
    posterPath: r.poster_path ?? null,
    releaseDate: r.release_date ?? null,
    firstAirDate: r.first_air_date ?? null,
    voteAverage: r.vote_average ?? null,
  };
}

/** Persists shell titles for `items` (plus any `extra` entries) and attaches ids and image URLs. */
function withTitleIds(items: BrowseItem[], extra: BrowseItem[] = []) {
  const titleMap = ensureBrowseTitlesExist([...items, ...extra]);
  const withIds = items.map((item) => {
    const entry = titleMap.get(`${item.tmdbId}-${item.type}`);
    return {
      ...item,
      id: entry?.id ?? "",
      posterPath: tmdbImageUrl(item.posterPath, "posters"),
      posterThumbHash: entry?.posterThumbHash ?? null,
    };
  });
  return { items: withIds, titleMap };
}

function userStateFor(userId: string, titleIds: string[]) {
  if (titleIds.length === 0) {
    return { userStatuses: {}, episodeProgress: {} };
  }
  return {
    userStatuses: getDisplayStatusesByTitleIds(userId, titleIds),
    episodeProgress: getEpisodeProgressByTitleIds(userId, titleIds),
  };
}

// ─── Trending ─────────────────────────────────────────────────

export async function getTrendingFeed(
  userId: string,
  input: { type: "all" | "movie" | "tv"; page: number },
) {
  const data = await getTrending(input.type, "day", input.page);
  const results = listResults(data);

  const baseItems = results
    .filter((r) => r.poster_path)
    .map((r) => toBrowseItem(r, isMediaType(r.media_type) ? r.media_type : "movie"));
  const heroResult = results.find((r) => r.backdrop_path && isMediaType(r.media_type));
  const heroItem =
    heroResult && isMediaType(heroResult.media_type)
      ? toBrowseItem(heroResult, heroResult.media_type)
      : null;

  const { items, titleMap } = withTitleIds(baseItems, heroItem ? [heroItem] : []);

  const heroEntry = heroItem ? titleMap.get(`${heroItem.tmdbId}-${heroItem.type}`) : undefined;
  const hero =
    heroResult && heroItem
      ? {
          id: heroEntry?.id ?? "",
          tmdbId: heroItem.tmdbId,
          type: heroItem.type,
          title: heroItem.title,
          overview: heroResult.overview ?? "",
          backdropPath: tmdbImageUrl(heroResult.backdrop_path ?? null, "backdrops"),
          voteAverage: heroResult.vote_average ?? 0,
        }
      : null;

  return {
    items,
    hero,
    ...userStateFor(
      userId,
      items.map((item) => item.id),
    ),
    ...pagingOf(data, input.page),
  };
}

// ─── Popular ──────────────────────────────────────────────────

export async function getPopularFeed(userId: string, input: { type: MediaType; page: number }) {
  const data = await getPopular(input.type, input.page);
  const baseItems = listResults(data)
    .filter((r) => r.poster_path)
    .map((r) => toBrowseItem(r, input.type));

  const { items } = withTitleIds(baseItems);

  return {
    items,
    ...userStateFor(
      userId,
      items.map((item) => item.id),
    ),
    ...pagingOf(data, input.page),
  };
}

// ─── Search ───────────────────────────────────────────────────

type SearchType = "movie" | "tv" | "person";

function toPersonResult(r: TmdbListResult) {
  return {
    tmdbId: r.id,
    type: "person" as const,
    title: r.name ?? "Unknown",
    posterPath: null,
    profilePath: r.profile_path ?? null,
    overview: null,
    releaseDate: null,
    popularity: r.popularity ?? null,
    voteAverage: null,
    knownForDepartment: null,
    knownFor: null,
  };
}

function toTitleSearchResult(r: TmdbListResult, type: MediaType) {
  return {
    tmdbId: r.id,
    type,
    title: r.title ?? r.name ?? "",
    overview: r.overview ?? null,
    releaseDate: r.release_date ?? r.first_air_date ?? null,
    posterPath: r.poster_path ?? null,
    profilePath: null,
    popularity: r.popularity ?? null,
    voteAverage: r.vote_average ?? null,
    knownForDepartment: null,
    knownFor: null,
  };
}

async function searchPeople(query: string, requestedPage: number) {
  const personResults = await searchPerson(query, requestedPage);
  const personItems = (personResults.results ?? []).map((r) => ({
    tmdbId: r.id,
    type: "person" as const,
    title: r.name ?? "",
    posterPath: null,
    profilePath: r.profile_path ?? null,
    overview: null,
    releaseDate: null,
    popularity: r.popularity ?? null,
    voteAverage: null,
    knownForDepartment: r.known_for_department ?? null,
    knownFor:
      r.known_for
        ?.slice(0, 3)
        .map((k) => k.title ?? (k as { name?: string }).name)
        .filter((s): s is string => !!s) ?? null,
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
    results: personItems.map((r) =>
      Object.assign(r, {
        id: personMap.get(r.tmdbId),
        profilePath: tmdbImageUrl(r.profilePath, "profiles"),
      }),
    ),
    ...pagingOf(personResults, requestedPage),
  };
}

export async function searchCatalog(input: {
  query: string;
  type?: SearchType | null;
  page: number;
}) {
  const query = input.query.trim();
  if (!query) {
    return { results: [], page: 1, totalPages: 0, totalResults: 0 };
  }
  const type = input.type ?? null;

  if (type === "person") {
    return searchPeople(query, input.page);
  }

  const raw: TmdbPage =
    type === "movie"
      ? await searchMovies(query, input.page)
      : type === "tv"
        ? await searchTv(query, input.page)
        : await searchMulti(query, input.page);

  const mapped = listResults(raw)
    .map((r) => {
      if (r.media_type === "person") return toPersonResult(r);
      const mediaType = isMediaType(r.media_type) ? r.media_type : type;
      if (!mediaType) return null;
      return toTitleSearchResult(r, mediaType);
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const titleResults = mapped.filter(
    (r): r is typeof r & { type: MediaType } => r.type !== "person",
  );
  const titleMap = ensureBrowseTitlesExist(
    titleResults.map((r) => ({
      tmdbId: r.tmdbId,
      type: r.type,
      title: r.title,
      overview: r.overview,
      posterPath: r.posterPath,
      popularity: r.popularity,
      voteAverage: r.voteAverage,
      releaseDate: r.type === "movie" ? r.releaseDate : null,
      firstAirDate: r.type === "tv" ? r.releaseDate : null,
    })),
  );

  const personMap = ensureBrowsePersonsExist(
    mapped
      .filter((r) => r.type === "person")
      .map((r) => ({
        tmdbId: r.tmdbId,
        name: r.title,
        profilePath: r.profilePath,
        knownForDepartment: r.knownForDepartment,
        popularity: r.popularity,
      })),
  );

  const results = mapped.map((r) => {
    if (r.type === "person") {
      return Object.assign(r, {
        id: personMap.get(r.tmdbId),
        profilePath: tmdbImageUrl(r.profilePath, "profiles"),
      });
    }
    const entry = titleMap.get(`${r.tmdbId}-${r.type}`);
    return Object.assign(r, { id: entry?.id, posterPath: tmdbImageUrl(r.posterPath, "posters") });
  });

  return { results, ...pagingOf(raw, input.page) };
}

// ─── Browse (filtered discovery) ──────────────────────────────

/** Builds the TMDB /discover query from the user's filters. */
export function buildDiscoverParams(
  input: DiscoverFilters,
  platformTmdbIds: number[],
  watchRegion: string,
): Record<string, string> {
  const params: Record<string, string> = {
    sort_by: tmdbSortBy(input.type, input.sortBy),
    "vote_count.gte": "50",
  };
  const dateKey = input.type === "movie" ? "primary_release_date" : "first_air_date";
  if (input.genreId) params.with_genres = String(input.genreId);
  if (input.yearMin) params[`${dateKey}.gte`] = `${input.yearMin}-01-01`;
  if (input.yearMax) params[`${dateKey}.lte`] = `${input.yearMax}-12-31`;
  if (input.ratingMin != null) params["vote_average.gte"] = String(input.ratingMin);
  if (input.language) params.with_original_language = input.language;
  if (platformTmdbIds.length > 0) {
    params.with_watch_providers = platformTmdbIds.join("|");
    params.watch_region = watchRegion;
  }
  return params;
}

export async function browseCatalog(userId: string, input: DiscoverFilters) {
  const platformTmdbIds = input.platformId ? getPlatformTmdbIds(input.platformId) : [];
  const params = buildDiscoverParams(input, platformTmdbIds, WATCH_REGION);

  const data = await discover(input.type, params, input.page);
  const baseItems = listResults(data)
    .filter((r) => r.poster_path)
    .map((r) => toBrowseItem(r, input.type));

  const { items } = withTitleIds(baseItems);

  return {
    items,
    ...userStateFor(
      userId,
      items.map((item) => item.id),
    ),
    ...pagingOf(data, input.page),
  };
}

// ─── Genres ───────────────────────────────────────────────────

export async function getTmdbGenres(type: MediaType) {
  const data = await getGenres(type);
  return {
    genres: (data.genres ?? []).map((g) => ({
      id: g.id,
      name: g.name ?? "",
    })),
  };
}
