import type { DeviceCodeResponse, ImportProvider, PollResult } from "./types";

const API_BASE = "https://api.trakt.tv";

function traktHeaders(clientId: string, token?: string): Record<string, string> {
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
    // 5xx: likely transient — keep polling
    if (res.status >= 500) return { status: "pending" };
    // Unknown 4xx: likely permanent — treat as expired
    return { status: "expired" };
  },

  async fetchUserData(accessToken, clientId): Promise<unknown> {
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

    // If all endpoints failed, throw so the caller gets a clear error
    if (!moviesRes.ok && !showsRes.ok && !watchlistRes.ok && !ratingsRes.ok) {
      throw new Error(
        `Trakt API returned errors: movies ${moviesRes.status}, shows ${showsRes.status}, watchlist ${watchlistRes.status}, ratings ${ratingsRes.status}`,
      );
    }

    const [moviesData, showsData, watchlistData, ratingsData] = await Promise.all([
      moviesRes.ok ? moviesRes.json() : [],
      showsRes.ok ? showsRes.json() : [],
      watchlistRes.ok ? watchlistRes.json() : [],
      ratingsRes.ok ? ratingsRes.json() : [],
    ]);

    // Return raw aggregated API response — parsing happens on the self-hosted server
    return {
      history: { movies: moviesData, shows: showsData },
      watchlist: watchlistData,
      ratings: ratingsData,
    };
  },
};
