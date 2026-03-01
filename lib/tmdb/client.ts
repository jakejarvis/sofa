import type {
  TmdbMovieDetails,
  TmdbRecommendationResponse,
  TmdbSearchResponse,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbWatchProviderResponse,
} from "./types";

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
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }

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

export { tmdbImageUrl } from "./image";
