import { createLogger } from "@/lib/logger";
import type {
  TmdbFindResult,
  TmdbGenreListResponse,
  TmdbMovieDetails,
  TmdbRecommendationResponse,
  TmdbSearchResponse,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbWatchProviderResponse,
} from "./types";

const log = createLogger("tmdb");

const BASE_URL =
  process.env.TMDB_API_BASE_URL || "https://api.themoviedb.org/3";
function getApiKey() {
  const key = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!key) throw new Error("TMDB_API_READ_ACCESS_TOKEN is not set");
  return key;
}

async function tmdbFetch<T>(
  path: string,
  params?: Record<string, string>,
  fetchOptions?: RequestInit,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const start = performance.now();
  const res = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
      ...fetchOptions?.headers,
    },
  });
  const elapsed = Math.round(performance.now() - start);

  if (!res.ok) {
    log.warn(
      `${url.toString()} -> ${res.status} ${res.statusText} (${elapsed}ms)`,
    );
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }

  log.debug(`${url.toString()} -> ${res.status} (${elapsed}ms)`);
  return res.json() as Promise<T>;
}

export async function searchMulti(query: string, page = 1) {
  return tmdbFetch<TmdbSearchResponse>("/search/multi", {
    query,
    page: String(page),
    include_adult: "false",
  });
}

export async function searchMovies(query: string, page = 1) {
  return tmdbFetch<TmdbSearchResponse>("/search/movie", {
    query,
    page: String(page),
  });
}

export async function searchTv(query: string, page = 1) {
  return tmdbFetch<TmdbSearchResponse>("/search/tv", {
    query,
    page: String(page),
  });
}

export async function getMovieDetails(tmdbId: number) {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`);
}

export async function getTvDetails(tmdbId: number) {
  return tmdbFetch<TmdbTvDetails>(`/tv/${tmdbId}`);
}

export async function getTvSeasonDetails(tmdbId: number, seasonNumber: number) {
  return tmdbFetch<TmdbSeasonDetails>(`/tv/${tmdbId}/season/${seasonNumber}`);
}

export async function getWatchProviders(tmdbId: number, type: "movie" | "tv") {
  return tmdbFetch<TmdbWatchProviderResponse>(
    `/${type}/${tmdbId}/watch/providers`,
  );
}

export async function getRecommendations(tmdbId: number, type: "movie" | "tv") {
  return tmdbFetch<TmdbRecommendationResponse>(
    `/${type}/${tmdbId}/recommendations`,
  );
}

export async function getSimilar(tmdbId: number, type: "movie" | "tv") {
  return tmdbFetch<TmdbRecommendationResponse>(`/${type}/${tmdbId}/similar`);
}

export async function getTrending(
  mediaType: "all" | "movie" | "tv",
  timeWindow: "day" | "week" = "day",
) {
  return tmdbFetch<TmdbSearchResponse>(
    `/trending/${mediaType}/${timeWindow}`,
    undefined,
    { next: { revalidate: 3600 } },
  );
}

export async function getPopular(type: "movie" | "tv", page = 1) {
  return tmdbFetch<TmdbSearchResponse>(
    `/${type}/popular`,
    { page: String(page) },
    { next: { revalidate: 3600 } },
  );
}

export async function getGenres(type: "movie" | "tv") {
  return tmdbFetch<TmdbGenreListResponse>(`/genre/${type}/list`, undefined, {
    next: { revalidate: 86400 },
  });
}

export async function discover(
  type: "movie" | "tv",
  params: Record<string, string>,
  page = 1,
) {
  return tmdbFetch<TmdbSearchResponse>(
    `/discover/${type}`,
    { ...params, page: String(page) },
    { next: { revalidate: 3600 } },
  );
}

export async function findByExternalId(
  externalId: string,
  source: "imdb_id" | "tvdb_id",
) {
  return tmdbFetch<TmdbFindResult>(`/find/${externalId}`, {
    external_source: source,
  });
}

export { tmdbImageUrl } from "./image";
