import { parseSimklPayload } from "@sofa/core/imports/parsers";
import type {
  DeviceCodeResponse,
  ImportProvider,
  NormalizedImport,
  PollResult,
} from "./types";

const API_BASE = "https://api.simkl.com";
const AUTH_BASE = "https://simkl.com";

function simklHeaders(
  clientId: string,
  token?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "simkl-api-key": clientId,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ─── Simkl API types ─────────────────────────────────────────

interface SimklIds {
  imdb?: string;
  tmdb?: string | number;
  tvdb?: string | number;
}

interface SimklApiItem {
  status?: string;
  user_rating?: number;
  last_watched_at?: string;
  movie?: { title?: string; year?: number; ids?: SimklIds };
  show?: { title?: string; year?: number; ids?: SimklIds };
  seasons?: {
    number?: number;
    episodes?: { number?: number; watched_at?: string }[];
  }[];
}

/** Flatten Simkl API response items into the shape parseSimklPayload expects.
 *  When fetched with `episode_watched_at=yes`, the API returns ALL episodes
 *  in the seasons array — filter to only those with a `watched_at` timestamp
 *  so unwatched episodes don't get imported as watched. */
function flattenSimklItems(items: SimklApiItem[], mediaKey: "movie" | "show") {
  return items.map((item) => {
    const media = item[mediaKey];
    // Strip unwatched episodes from API response (they lack watched_at),
    // then drop seasons that end up empty so the parser's missing-episode
    // warning still fires correctly.
    const filteredSeasons = item.seasons
      ?.map((s) => ({
        ...s,
        episodes: s.episodes?.filter((ep) => ep.watched_at),
      }))
      .filter((s) => s.episodes && s.episodes.length > 0);
    return {
      title: media?.title,
      year: media?.year,
      ids: media?.ids,
      status: item.status,
      user_rating: item.user_rating,
      last_watched_at: item.last_watched_at,
      seasons: filteredSeasons,
    };
  });
}

// ─── Provider ────────────────────────────────────────────────

export const simkl: ImportProvider = {
  async getDeviceCode(clientId): Promise<DeviceCodeResponse> {
    const res = await fetch(`${API_BASE}/oauth/pin?client_id=${clientId}`, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Simkl device code failed: ${res.status}`);
    const data = (await res.json()) as {
      device_code: string;
      user_code: string;
      verification_url: string;
      expires_in: number;
      interval: number;
    };
    return {
      device_code: data.user_code, // Simkl checks PIN status by user_code, not device_code
      user_code: data.user_code,
      verification_url: data.verification_url || `${AUTH_BASE}/pin`,
      expires_in: data.expires_in,
      interval: data.interval || 5,
    };
  },

  async pollForToken(clientId, _clientSecret, deviceCode): Promise<PollResult> {
    const res = await fetch(`${API_BASE}/oauth/pin/${deviceCode}`, {
      method: "GET",
      headers: { "simkl-api-key": clientId },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return { status: "pending" };

    const data = (await res.json()) as {
      result?: string;
      access_token?: string;
    };

    if (data.result === "OK" && data.access_token) {
      return { status: "authorized", accessToken: data.access_token };
    }
    if (data.result === "KO") return { status: "denied" };
    return { status: "pending" };
  },

  async fetchUserData(accessToken, clientId): Promise<NormalizedImport> {
    const headers = simklHeaders(clientId, accessToken);

    // Fetch movies, shows, and anime in parallel
    const [moviesRes, showsRes, animeRes] = await Promise.all([
      fetch(`${API_BASE}/sync/all-items/movies`, { headers }),
      fetch(
        `${API_BASE}/sync/all-items/shows?extended=full&episode_watched_at=yes`,
        { headers },
      ),
      fetch(
        `${API_BASE}/sync/all-items/anime?extended=full&episode_watched_at=yes`,
        { headers },
      ),
    ]);

    // If all endpoints failed, throw so the caller gets a clear error
    if (!moviesRes.ok && !showsRes.ok && !animeRes.ok) {
      throw new Error(
        `Simkl API returned errors: movies ${moviesRes.status}, shows ${showsRes.status}, anime ${animeRes.status}`,
      );
    }

    const [moviesData, showsData, animeData] = await Promise.all([
      moviesRes.ok
        ? (moviesRes.json() as Promise<SimklApiItem[]>)
        : ([] as SimklApiItem[]),
      showsRes.ok
        ? (showsRes.json() as Promise<SimklApiItem[]>)
        : ([] as SimklApiItem[]),
      animeRes.ok
        ? (animeRes.json() as Promise<SimklApiItem[]>)
        : ([] as SimklApiItem[]),
    ]);

    // Flatten API's nested movie/show objects into the flat format
    // the core parser expects, then delegate normalization
    const result = parseSimklPayload({
      movies: flattenSimklItems(moviesData, "movie"),
      shows: flattenSimklItems(showsData, "show"),
      anime: flattenSimklItems(animeData, "show"),
    });

    return result.data;
  },
};
