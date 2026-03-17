import { parseTraktPayload } from "@sofa/core/imports/parsers";
import type {
  DeviceCodeResponse,
  ImportProvider,
  NormalizedImport,
  PollResult,
} from "./types";

const API_BASE = "https://api.trakt.tv";

function traktHeaders(
  clientId: string,
  token?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": clientId,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ─── Provider ────────────────────────────────────────────────

export const trakt: ImportProvider = {
  async getDeviceCode(clientId): Promise<DeviceCodeResponse> {
    const res = await fetch(`${API_BASE}/oauth/device/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Trakt device code failed: ${res.status}`);
    return (await res.json()) as DeviceCodeResponse;
  },

  async pollForToken(clientId, clientSecret, deviceCode): Promise<PollResult> {
    const res = await fetch(`${API_BASE}/oauth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: deviceCode,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 200) {
      const data = (await res.json()) as { access_token: string };
      return { status: "authorized", accessToken: data.access_token };
    }
    if (res.status === 400) return { status: "pending" };
    if (res.status === 404) return { status: "expired" };
    if (res.status === 410) return { status: "expired" };
    if (res.status === 418) return { status: "denied" };
    if (res.status === 429) return { status: "pending" };
    return { status: "expired" };
  },

  async fetchUserData(accessToken, clientId): Promise<NormalizedImport> {
    const headers = traktHeaders(clientId, accessToken);

    // Fetch all data in parallel
    const [moviesRes, showsRes, watchlistRes, ratingsRes] = await Promise.all([
      fetch(`${API_BASE}/sync/history/movies?limit=10000`, { headers }),
      fetch(`${API_BASE}/sync/history/shows?limit=10000`, { headers }),
      fetch(`${API_BASE}/sync/watchlist?extended=metadata&limit=10000`, {
        headers,
      }),
      fetch(`${API_BASE}/sync/ratings`, { headers }),
    ]);

    const [moviesData, showsData, watchlistData, ratingsData] =
      await Promise.all([
        moviesRes.ok ? moviesRes.json() : [],
        showsRes.ok ? showsRes.json() : [],
        watchlistRes.ok ? watchlistRes.json() : [],
        ratingsRes.ok ? ratingsRes.json() : [],
      ]);

    // Restructure API response into the format parseTraktPayload expects.
    // The Trakt API returns the same item shapes as the JSON export format.
    type TraktPayload = Parameters<typeof parseTraktPayload>[0];
    const result = parseTraktPayload({
      history: { movies: moviesData, shows: showsData },
      watchlist: watchlistData,
      ratings: ratingsData,
    } as TraktPayload);

    return result.data;
  },
};
