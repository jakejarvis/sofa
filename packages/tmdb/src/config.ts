/**
 * Server-side configuration checks.
 * Call these in route handlers or server components — never on the client.
 */

export function isTmdbConfigured(): boolean {
  return !!process.env.TMDB_API_READ_ACCESS_TOKEN?.trim();
}

export const DEFAULT_TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

/**
 * Work out how to reach the TMDB API from TMDB_API_BASE_URL. Schema paths
 * already start with `/3/`, so:
 * - a base ending in `/3` (the default, or a proxy mirroring TMDB's layout)
 *   drops `/3` from the base and uses schema paths as-is;
 * - a base without `/3` (a proxy mounted at the API root, e.g.
 *   https://tmdb.internal) keeps the base and strips `/3` from each path.
 * Trailing slashes are ignored.
 */
export function resolveTmdbBase(configured?: string): {
  baseUrl: string;
  stripVersionPrefix: boolean;
} {
  const base = (configured?.trim() || DEFAULT_TMDB_API_BASE_URL).replace(/\/+$/, "");
  if (base.endsWith("/3")) {
    return { baseUrl: base.slice(0, -2), stripVersionPrefix: false };
  }
  return { baseUrl: base, stripVersionPrefix: true };
}

/** Absolute URL for a TMDB API path such as "/configuration". */
export function tmdbApiUrl(path: string, configured = process.env.TMDB_API_BASE_URL): string {
  const { baseUrl, stripVersionPrefix } = resolveTmdbBase(configured);
  return `${baseUrl}${stripVersionPrefix ? "" : "/3"}${path}`;
}
