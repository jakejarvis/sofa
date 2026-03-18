import { findByExternalId, searchMovies, searchTv } from "@sofa/tmdb/client";

// ─── Types ──────────────────────────────────────────────────────────

export interface ExternalIds {
  tmdbId?: number;
  imdbId?: string;
  tvdbId?: number | string;
  title?: string;
  year?: number;
}

// ─── Rate Limiter ───────────────────────────────────────────────────

class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillMs: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.refill();
      if (this.tokens > 0) {
        this.tokens--;
        return;
      }
      const waitMs = this.refillMs - (Date.now() - this.lastRefill);
      await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 50)));
    }
    throw new Error("Rate limiter timed out after too many attempts");
  }

  private refill() {
    const now = Date.now();
    if (now - this.lastRefill >= this.refillMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }
}

/** TMDB allows 40 req/s — use 35 to leave headroom */
const tmdbLimiter = new RateLimiter(35, 1_000);

// ─── Movie Resolution ───────────────────────────────────────────────

/**
 * Resolve a movie's TMDB ID from various external IDs.
 * Fallback chain: direct TMDB ID → IMDB → TVDB → title+year search.
 */
export async function resolveMovieTmdbId(
  ids: ExternalIds,
  cache?: Map<string, number | null>,
): Promise<number | null> {
  if (ids.tmdbId) return ids.tmdbId;

  const key = `movie:${ids.imdbId ?? ""}:${ids.tvdbId ?? ""}:${ids.title ?? ""}:${ids.year ?? ""}`;
  if (cache?.has(key)) return cache.get(key) ?? null;

  if (ids.imdbId) {
    await tmdbLimiter.acquire();
    const result = await findByExternalId(ids.imdbId, "imdb_id");
    const movie = result.movie_results?.[0];
    if (movie) {
      cache?.set(key, movie.id);
      return movie.id;
    }
  }

  if (ids.tvdbId) {
    await tmdbLimiter.acquire();
    const result = await findByExternalId(String(ids.tvdbId), "tvdb_id");
    const movie = result.movie_results?.[0];
    if (movie) {
      cache?.set(key, movie.id);
      return movie.id;
    }
  }

  if (ids.title) {
    await tmdbLimiter.acquire();
    const searchResult = await searchMovies(ids.title);
    const results = searchResult.results ?? [];
    if (ids.year) {
      const match = results.find((r) => {
        const releaseYear = r.release_date ? new Date(r.release_date).getFullYear() : null;
        return releaseYear === ids.year;
      });
      if (match) {
        cache?.set(key, match.id);
        return match.id;
      }
      // Year specified but no match — don't fall back to an arbitrary result
    } else if (results[0]) {
      cache?.set(key, results[0].id);
      return results[0].id;
    }
  }

  cache?.set(key, null);
  return null;
}

// ─── Show Resolution ────────────────────────────────────────────────

/**
 * Resolve a TV show's TMDB ID from various external IDs.
 * Fallback chain: direct TMDB ID → IMDB → TVDB → title search.
 * Handles both show-level and episode-level external IDs.
 */
export async function resolveShowTmdbId(
  ids: ExternalIds,
  cache?: Map<string, number | null>,
): Promise<number | null> {
  if (ids.tmdbId) return ids.tmdbId;

  const key = `tv:${ids.imdbId ?? ""}:${ids.tvdbId ?? ""}:${ids.title ?? ""}:${ids.year ?? ""}`;
  if (cache?.has(key)) return cache.get(key) ?? null;

  if (ids.imdbId) {
    await tmdbLimiter.acquire();
    const result = await findByExternalId(ids.imdbId, "imdb_id");
    // IMDB ID might reference an episode — extract the show_id
    const ep = result.tv_episode_results?.[0];
    if (ep) {
      cache?.set(key, ep.show_id);
      return ep.show_id;
    }
    const show = result.tv_results?.[0];
    if (show) {
      cache?.set(key, show.id);
      return show.id;
    }
  }

  if (ids.tvdbId) {
    await tmdbLimiter.acquire();
    const result = await findByExternalId(String(ids.tvdbId), "tvdb_id");
    const ep = result.tv_episode_results?.[0];
    if (ep) {
      cache?.set(key, ep.show_id);
      return ep.show_id;
    }
    const show = result.tv_results?.[0];
    if (show) {
      cache?.set(key, show.id);
      return show.id;
    }
  }

  if (ids.title) {
    await tmdbLimiter.acquire();
    const searchResult = await searchTv(ids.title);
    const results = searchResult.results ?? [];
    if (ids.year) {
      const match = results.find((r) => {
        const airYear = r.first_air_date ? new Date(r.first_air_date).getFullYear() : null;
        return airYear === ids.year;
      });
      if (match) {
        cache?.set(key, match.id);
        return match.id;
      }
      // Year specified but no match — don't fall back to an arbitrary result
    } else if (results[0]) {
      cache?.set(key, results[0].id);
      return results[0].id;
    }
  }

  cache?.set(key, null);
  return null;
}
