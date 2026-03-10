import { createLogger } from "@sofa/logger";
import createClient, { type Middleware } from "openapi-fetch";
import type { operations, paths } from "./schema";

const log = createLogger("tmdb");

// ─── Schema-derived types ───────────────────────────────────────────

/** Extract the 200 JSON response body from an operation */
type OpResponse<K extends keyof operations> = operations[K] extends {
  responses: {
    200: { content: { "application/json": infer T } };
  };
}
  ? T
  : never;

// Search
export type TmdbSearchResponse = OpResponse<"search-multi">;
export type TmdbSearchResult = NonNullable<
  TmdbSearchResponse["results"]
>[number];

// Movie details — augmented with append_to_response data
export type TmdbMovieDetails = OpResponse<"movie-details"> & {
  release_dates?: {
    results: NonNullable<OpResponse<"movie-release-dates">["results"]>;
  };
};

// TV details — augmented with append_to_response data
export type TmdbTvDetails = OpResponse<"tv-series-details"> & {
  content_ratings?: OpResponse<"tv-series-content-ratings">;
  external_ids?: OpResponse<"tv-series-external-ids">;
};

// Watch providers — manually defined because the schema types `results` as an
// object with literal country-code keys rather than Record<string, ...>, which
// makes dynamic lookups (e.g. results["US"]) impractical.
export interface TmdbProvider {
  logo_path?: string;
  provider_id: number;
  provider_name?: string;
  display_priority: number;
}

export interface TmdbWatchProviderRegion {
  link?: string;
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
}

export interface TmdbWatchProviderResponse {
  id: number;
  results?: Record<string, TmdbWatchProviderRegion>;
}

// Recommendations — movie-recommendations is Record<string, never> in schema,
// so we base on tv-series-recommendations and add movie fields TMDB returns.
type TvRecResult = NonNullable<
  OpResponse<"tv-series-recommendations">["results"]
>[number];
export type TmdbRecommendationResponse = Omit<
  OpResponse<"tv-series-recommendations">,
  "results"
> & {
  results?: (TvRecResult & {
    title?: string;
    original_title?: string;
    release_date?: string;
  })[];
};

// Find — schema types tv_results and tv_episode_results as unknown[]
export type TmdbFindResult = Omit<
  OpResponse<"find-by-id">,
  "tv_results" | "tv_episode_results"
> & {
  tv_results?: TmdbSearchResult[];
  tv_episode_results?: {
    id: number;
    episode_number: number;
    name: string;
    season_number: number;
    show_id: number;
  }[];
};

// Videos
export type TmdbVideo = NonNullable<
  OpResponse<"movie-videos">["results"]
>[number];

// Genres
export type TmdbGenre = NonNullable<
  OpResponse<"genre-movie-list">["genres"]
>[number];

// Person — schema types deathday as unknown
export type TmdbPersonDetails = Omit<
  OpResponse<"person-details">,
  "deathday"
> & {
  deathday?: string | null;
};

// ─── Client setup ───────────────────────────────────────────────────

function getApiKey() {
  const key = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!key) throw new Error("TMDB_API_READ_ACCESS_TOKEN is not set");
  return key;
}

// The default TMDB base URL ends with /3, matching the schema's /3/… paths.
// Custom proxy URLs (e.g. https://tmdb.internal) may omit /3 — those worked
// before because the old client built paths like /search/multi against the
// custom base. To preserve that, we always strip /3 from the configured URL
// and use the schema paths as-is (they already include /3/).
const DEFAULT_TMDB_BASE = "https://api.themoviedb.org/3";
const configuredBase = process.env.TMDB_API_BASE_URL || DEFAULT_TMDB_BASE;
const isCustomBase = configuredBase !== DEFAULT_TMDB_BASE;
const baseUrl = configuredBase.replace(/\/3\/?$/, "");

const baseUrlRewriteMiddleware: Middleware | null = isCustomBase
  ? {
      async onRequest({ request }) {
        // Custom proxy: strip the /3 prefix from schema paths so requests
        // go to e.g. https://tmdb.internal/search/multi instead of /3/search/multi
        const url = new URL(request.url);
        url.pathname = url.pathname.replace(/^\/3\//, "/");
        return new Request(url.toString(), request);
      },
    }
  : null;

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    request.headers.set("Authorization", `Bearer ${getApiKey()}`);
    request.headers.set("Accept", "application/json");
    return request;
  },
};

const requestTimings = new WeakMap<Request, number>();

const loggingMiddleware: Middleware = {
  async onRequest({ request }) {
    requestTimings.set(request, performance.now());
    return request;
  },
  async onResponse({ request, response }) {
    const start = requestTimings.get(request);
    const elapsed = start ? Math.round(performance.now() - start) : 0;
    if (!response.ok) {
      log.warn(
        `${request.url} -> ${response.status} ${response.statusText} (${elapsed}ms)`,
      );
    } else {
      log.debug(`${request.url} -> ${response.status} (${elapsed}ms)`);
    }
    return undefined;
  },
};

const client = createClient<paths>({ baseUrl });
if (baseUrlRewriteMiddleware) client.use(baseUrlRewriteMiddleware);
client.use(authMiddleware, loggingMiddleware);

// ─── Search ─────────────────────────────────────────────────────────

export async function searchMulti(query: string, page = 1) {
  const { data, error } = await client.GET("/3/search/multi", {
    params: { query: { query, page, include_adult: false } },
  });
  if (error) throw new Error("TMDB API error: search/multi");
  return data;
}

export async function searchMovies(query: string, page = 1) {
  const { data, error } = await client.GET("/3/search/movie", {
    params: { query: { query, page } },
  });
  if (error) throw new Error("TMDB API error: search/movie");
  return data;
}

export async function searchTv(query: string, page = 1) {
  const { data, error } = await client.GET("/3/search/tv", {
    params: { query: { query, page } },
  });
  if (error) throw new Error("TMDB API error: search/tv");
  return data;
}

// ─── Details ────────────────────────────────────────────────────────

export async function getMovieDetails(tmdbId: number) {
  const { data, error } = await client.GET("/3/movie/{movie_id}", {
    params: {
      path: { movie_id: tmdbId },
      query: { append_to_response: "release_dates" },
    },
  });
  if (error) throw new Error(`TMDB API error: movie/${tmdbId}`);
  return data as TmdbMovieDetails;
}

export async function getTvDetails(tmdbId: number) {
  const { data, error } = await client.GET("/3/tv/{series_id}", {
    params: {
      path: { series_id: tmdbId },
      query: { append_to_response: "content_ratings,external_ids" },
    },
  });
  if (error) throw new Error(`TMDB API error: tv/${tmdbId}`);
  return data as TmdbTvDetails;
}

export async function getTvExternalIds(tmdbId: number) {
  const { data, error } = await client.GET("/3/tv/{series_id}/external_ids", {
    params: { path: { series_id: tmdbId } },
  });
  if (error) throw new Error(`TMDB API error: tv/${tmdbId}/external_ids`);
  return data;
}

export async function getTvSeasonDetails(tmdbId: number, seasonNumber: number) {
  const { data, error } = await client.GET(
    "/3/tv/{series_id}/season/{season_number}",
    {
      params: {
        path: { series_id: tmdbId, season_number: seasonNumber },
      },
    },
  );
  if (error)
    throw new Error(`TMDB API error: tv/${tmdbId}/season/${seasonNumber}`);
  return data;
}

// ─── Watch Providers ────────────────────────────────────────────────

export async function getWatchProviders(tmdbId: number, type: "movie" | "tv") {
  if (type === "movie") {
    const { data, error } = await client.GET(
      "/3/movie/{movie_id}/watch/providers",
      { params: { path: { movie_id: tmdbId } } },
    );
    if (error)
      throw new Error(`TMDB API error: movie/${tmdbId}/watch/providers`);
    return data as TmdbWatchProviderResponse;
  }
  const { data, error } = await client.GET(
    "/3/tv/{series_id}/watch/providers",
    { params: { path: { series_id: tmdbId } } },
  );
  if (error) throw new Error(`TMDB API error: tv/${tmdbId}/watch/providers`);
  return data as TmdbWatchProviderResponse;
}

// ─── Recommendations & Similar ──────────────────────────────────────

export async function getRecommendations(tmdbId: number, type: "movie" | "tv") {
  if (type === "movie") {
    const { data, error } = await client.GET(
      "/3/movie/{movie_id}/recommendations",
      { params: { path: { movie_id: tmdbId } } },
    );
    if (error)
      throw new Error(`TMDB API error: movie/${tmdbId}/recommendations`);
    return data as TmdbRecommendationResponse;
  }
  const { data, error } = await client.GET(
    "/3/tv/{series_id}/recommendations",
    { params: { path: { series_id: tmdbId } } },
  );
  if (error) throw new Error(`TMDB API error: tv/${tmdbId}/recommendations`);
  return data as TmdbRecommendationResponse;
}

export async function getSimilar(tmdbId: number, type: "movie" | "tv") {
  if (type === "movie") {
    const { data, error } = await client.GET("/3/movie/{movie_id}/similar", {
      params: { path: { movie_id: tmdbId } },
    });
    if (error) throw new Error(`TMDB API error: movie/${tmdbId}/similar`);
    return data as TmdbRecommendationResponse;
  }
  // Schema incorrectly types series_id as string here (number everywhere else)
  const { data, error } = await client.GET("/3/tv/{series_id}/similar", {
    params: { path: { series_id: String(tmdbId) } },
  });
  if (error) throw new Error(`TMDB API error: tv/${tmdbId}/similar`);
  return data as TmdbRecommendationResponse;
}

// ─── Trending & Popular ─────────────────────────────────────────────

export async function getTrending(
  mediaType: "all" | "movie" | "tv",
  timeWindow: "day" | "week" = "day",
) {
  const opts = {
    params: { path: { time_window: timeWindow } },
  } as const;

  if (mediaType === "movie") {
    const { data, error } = await client.GET(
      "/3/trending/movie/{time_window}",
      opts,
    );
    if (error) throw new Error("TMDB API error: trending/movie");
    return data;
  }
  if (mediaType === "tv") {
    const { data, error } = await client.GET(
      "/3/trending/tv/{time_window}",
      opts,
    );
    if (error) throw new Error("TMDB API error: trending/tv");
    return data;
  }
  const { data, error } = await client.GET(
    "/3/trending/all/{time_window}",
    opts,
  );
  if (error) throw new Error("TMDB API error: trending/all");
  return data;
}

export async function getPopular(type: "movie" | "tv", page = 1) {
  if (type === "movie") {
    const { data, error } = await client.GET("/3/movie/popular", {
      params: { query: { page } },
    });
    if (error) throw new Error("TMDB API error: movie/popular");
    return data;
  }
  const { data, error } = await client.GET("/3/tv/popular", {
    params: { query: { page } },
  });
  if (error) throw new Error("TMDB API error: tv/popular");
  return data;
}

// ─── Genres ─────────────────────────────────────────────────────────

export async function getGenres(type: "movie" | "tv") {
  if (type === "movie") {
    const { data, error } = await client.GET("/3/genre/movie/list", {});
    if (error) throw new Error("TMDB API error: genre/movie/list");
    return data;
  }
  const { data, error } = await client.GET("/3/genre/tv/list", {});
  if (error) throw new Error("TMDB API error: genre/tv/list");
  return data;
}

// ─── Discover ───────────────────────────────────────────────────────

export async function discover(
  type: "movie" | "tv",
  params: Record<string, string>,
  page = 1,
) {
  // Discover accepts many dynamic filter params (with_genres, vote_count.gte, etc.)
  // that aren't individually typed in the schema, so widen to Record<string, unknown>.
  if (type === "movie") {
    const { data, error } = await client.GET("/3/discover/movie", {
      params: { query: { ...params, page } as Record<string, unknown> },
    });
    if (error) throw new Error("TMDB API error: discover/movie");
    return data;
  }
  const { data, error } = await client.GET("/3/discover/tv", {
    params: { query: { ...params, page } as Record<string, unknown> },
  });
  if (error) throw new Error("TMDB API error: discover/tv");
  return data;
}

// ─── Videos ─────────────────────────────────────────────────────────

export async function getVideos(tmdbId: number, type: "movie" | "tv") {
  if (type === "movie") {
    const { data, error } = await client.GET("/3/movie/{movie_id}/videos", {
      params: { path: { movie_id: tmdbId } },
    });
    if (error) throw new Error(`TMDB API error: movie/${tmdbId}/videos`);
    return data;
  }
  const { data, error } = await client.GET("/3/tv/{series_id}/videos", {
    params: { path: { series_id: tmdbId } },
  });
  if (error) throw new Error(`TMDB API error: tv/${tmdbId}/videos`);
  return data;
}

// ─── Find by External ID ───────────────────────────────────────────

export async function findByExternalId(
  externalId: string,
  source: "imdb_id" | "tvdb_id",
) {
  const { data, error } = await client.GET("/3/find/{external_id}", {
    params: {
      path: { external_id: externalId },
      query: { external_source: source },
    },
  });
  if (error) throw new Error(`TMDB API error: find/${externalId}`);
  return data as TmdbFindResult;
}

// ─── Person / Credits ───────────────────────────────────────────────

export async function getMovieCredits(tmdbId: number) {
  const { data, error } = await client.GET("/3/movie/{movie_id}/credits", {
    params: { path: { movie_id: tmdbId } },
  });
  if (error) throw new Error(`TMDB API error: movie/${tmdbId}/credits`);
  return data;
}

export async function getTvAggregateCredits(tmdbId: number) {
  const { data, error } = await client.GET(
    "/3/tv/{series_id}/aggregate_credits",
    { params: { path: { series_id: tmdbId } } },
  );
  if (error) throw new Error(`TMDB API error: tv/${tmdbId}/aggregate_credits`);
  return data;
}

export async function getPersonDetails(tmdbId: number) {
  const { data, error } = await client.GET("/3/person/{person_id}", {
    params: { path: { person_id: tmdbId } },
  });
  if (error) throw new Error(`TMDB API error: person/${tmdbId}`);
  return data as TmdbPersonDetails;
}

export async function getPersonCombinedCredits(tmdbId: number) {
  const { data, error } = await client.GET(
    "/3/person/{person_id}/combined_credits",
    // Schema incorrectly types person_id as string here (number everywhere else)
    { params: { path: { person_id: String(tmdbId) } } },
  );
  if (error)
    throw new Error(`TMDB API error: person/${tmdbId}/combined_credits`);
  return data;
}

export async function searchPerson(query: string, page = 1) {
  const { data, error } = await client.GET("/3/search/person", {
    params: { query: { query, page } },
  });
  if (error) throw new Error("TMDB API error: search/person");
  return data;
}

export { tmdbImageUrl } from "./image";
