export type StoredStatus = "watchlist" | "in_progress" | "completed";

export type DisplayStatus = "in_watchlist" | "watching" | "caught_up" | "completed";

export const ONGOING_TMDB_STATUSES = ["Returning Series", "In Production"];

/**
 * Derive the user-facing display status from stored status + context.
 *
 * Movies: watchlist → in_watchlist, completed → completed
 * TV:     watchlist → in_watchlist, in_progress → watching | caught_up | completed
 */
export function getDisplayStatus(
  storedStatus: StoredStatus,
  titleType: "movie" | "tv",
  tmdbStatus: string | null,
  episodeProgress: { watched: number; total: number } | null,
): DisplayStatus {
  if (storedStatus === "watchlist") return "in_watchlist";
  if (titleType === "movie") return storedStatus === "completed" ? "completed" : "in_watchlist";

  // TV with in_progress: derive from episode progress + TMDB show status
  if (
    episodeProgress &&
    episodeProgress.total > 0 &&
    episodeProgress.watched >= episodeProgress.total
  ) {
    return ONGOING_TMDB_STATUSES.includes(tmdbStatus ?? "") ? "caught_up" : "completed";
  }

  return "watching";
}
