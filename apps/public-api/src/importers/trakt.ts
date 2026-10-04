import type { DeviceCodeResponse, ImportProvider, PollResult } from "./types";

const API_BASE = "https://api.trakt.tv";

/** Items requested per page. Trakt may cap this; we always follow X-Pagination-Page-Count. */
const PAGE_LIMIT = 1000;
/** Hard stop per list (keeps us well inside Trakt's 1,000 GETs / 5 min and Vercel's max duration). */
export const MAX_PAGES_PER_LIST = 100;
const PAGE_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 20_000;
/**
 * Target size of the payload returned to the browser. Vercel Functions reject
 * response bodies over 4.5 MB (413 FUNCTION_PAYLOAD_TOO_LARGE); the poll route
 * adds a small envelope, so stay well below.
 */
export const TRAKT_PAYLOAD_BUDGET_BYTES = 4_000_000;

function traktHeaders(clientId: string, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": clientId,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

// ─── Slimming ────────────────────────────────────────────────

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(out: Obj, src: Obj, key: string): void {
  if (typeof src[key] === "string") out[key] = src[key];
}

function pickNumber(out: Obj, src: Obj, key: string): void {
  if (typeof src[key] === "number") out[key] = src[key];
}

function slimMedia(src: unknown): Obj | undefined {
  if (!isObj(src)) return undefined;
  const out: Obj = {};
  pickString(out, src, "title");
  pickNumber(out, src, "year");
  if (isObj(src.ids)) {
    const ids: Obj = {};
    pickNumber(ids, src.ids, "tmdb");
    pickString(ids, src.ids, "imdb");
    pickNumber(ids, src.ids, "tvdb");
    if (Object.keys(ids).length > 0) out.ids = ids;
  }
  return out;
}

/**
 * Keep only the fields every released Sofa `parseTraktPayload` reads, dropping
 * nulls and Trakt-internal data. Returns null for non-object input.
 */
export function slimTraktItem(item: unknown): Obj | null {
  if (!isObj(item)) return null;
  const out: Obj = {};
  pickString(out, item, "type");
  pickString(out, item, "watched_at");
  pickString(out, item, "listed_at");
  pickString(out, item, "rated_at");
  pickNumber(out, item, "rating");
  for (const key of ["movie", "show"] as const) {
    const media = slimMedia(item[key]);
    if (media) out[key] = media;
  }
  if (isObj(item.episode)) {
    const episode: Obj = {};
    pickNumber(episode, item.episode, "season");
    pickNumber(episode, item.episode, "number");
    out.episode = episode;
  }
  return out;
}

// ─── Pagination ──────────────────────────────────────────────

interface ListResult {
  items: Obj[];
  ok: boolean;
  warning?: string;
}

async function fetchPage(url: string, headers: Record<string, string>): Promise<Response | null> {
  try {
    return await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    return null;
  }
}

async function readArray(res: Response): Promise<unknown[] | null> {
  try {
    const body: unknown = await res.json();
    return Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

async function fetchAllPages(
  path: string,
  label: string,
  headers: Record<string, string>,
): Promise<ListResult> {
  const pageUrl = (page: number) =>
    `${API_BASE}${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=${PAGE_LIMIT}`;

  const first = await fetchPage(pageUrl(1), headers);
  if (!first?.ok) {
    const status = first?.status;
    return {
      items: [],
      ok: false,
      warning: `Couldn't fetch your Trakt ${label}${status ? ` (HTTP ${status})` : ""}; it was skipped.`,
    };
  }

  const raw: unknown[] = (await readArray(first)) ?? [];
  const headerCount = Number(first.headers.get("X-Pagination-Page-Count"));
  const pageCount = Number.isFinite(headerCount) && headerCount >= 1 ? headerCount : 1;
  const lastPage = Math.min(pageCount, MAX_PAGES_PER_LIST);

  let warning: string | undefined;
  for (let start = 2; start <= lastPage && !warning; start += PAGE_CONCURRENCY) {
    const pages = Array.from(
      { length: Math.min(PAGE_CONCURRENCY, lastPage - start + 1) },
      (_, i) => start + i,
    );
    const results = await Promise.all(
      pages.map(async (page) => {
        const res = await fetchPage(pageUrl(page), headers);
        return res?.ok ? await readArray(res) : null;
      }),
    );
    for (const [i, items] of results.entries()) {
      if (!items) {
        warning = `Only part of your Trakt ${label} could be fetched (stopped at page ${pages[i]} of ${pageCount}).`;
        break;
      }
      raw.push(...items);
    }
  }

  if (!warning && pageCount > MAX_PAGES_PER_LIST) {
    warning = `Only the first ${MAX_PAGES_PER_LIST} pages of your Trakt ${label} were fetched.`;
  }

  const items = raw.map(slimTraktItem).filter((i): i is Obj => i !== null);
  return { items, ok: true, warning };
}

// ─── Size budget ─────────────────────────────────────────────

export interface TraktPayload {
  history: { movies: unknown[]; shows: unknown[] };
  watchlist: unknown[];
  ratings: unknown[];
  warnings: string[];
}

function watchedAtOf(item: unknown): string {
  return isObj(item) && typeof item.watched_at === "string" ? item.watched_at : "";
}

/**
 * If the payload exceeds the budget, keep the most recent plays (watchlist and
 * ratings are always kept) and add a warning pointing at the export upload.
 */
export function fitToBudget(payload: TraktPayload, budgetBytes: number): TraktPayload {
  if (jsonBytes(payload) <= budgetBytes) return payload;

  const tagged = [
    ...payload.history.movies.map((item) => ({ item, kind: "movies" as const })),
    ...payload.history.shows.map((item) => ({ item, kind: "shows" as const })),
  ];
  // Most recent first; items without watched_at ("") sort last.
  tagged.sort((a, b) => {
    const wa = watchedAtOf(a.item);
    const wb = watchedAtOf(b.item);
    if (wa === wb) return 0;
    if (!wa) return 1;
    if (!wb) return -1;
    return wa < wb ? 1 : -1;
  });

  const result: TraktPayload = {
    history: { movies: [], shows: [] },
    watchlist: payload.watchlist,
    ratings: payload.ratings,
    warnings: [...payload.warnings],
  };
  const limit = budgetBytes - 1_000;
  let size = jsonBytes(result);
  let kept = 0;
  for (const { item, kind } of tagged) {
    const cost = jsonBytes(item) + 1;
    if (size + cost > limit) break;
    result.history[kind].push(item);
    size += cost;
    kept++;
  }

  result.warnings.push(
    `Your Trakt history has ${tagged.length.toLocaleString("en-US")} plays, but only the most recent ${kept.toLocaleString("en-US")} fit in a sign-in import. To import all of it, upload your Trakt data export instead (Settings → Import → Trakt).`,
  );
  return result;
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

    const [movies, shows, watchlist, ratings] = await Promise.all([
      fetchAllPages("/sync/history/movies", "movie history", headers),
      fetchAllPages("/sync/history/shows", "episode history", headers),
      fetchAllPages("/sync/watchlist", "watchlist", headers),
      fetchAllPages("/sync/ratings", "ratings", headers),
    ]);

    const lists = [movies, shows, watchlist, ratings];
    const warnings = lists.flatMap((l) => (l.warning ? [l.warning] : []));

    // If every list failed, throw so the caller gets a clear error
    if (lists.every((l) => !l.ok)) {
      throw new Error(`Trakt API returned errors for every list: ${warnings.join(" ")}`);
    }

    // Slimmed, aggregated API response — parsing happens on the self-hosted server
    return fitToBudget(
      {
        history: { movies: movies.items, shows: shows.items },
        watchlist: watchlist.items,
        ratings: ratings.items,
        warnings,
      },
      TRAKT_PAYLOAD_BUDGET_BYTES,
    );
  },
};
