/** TMDB rejects page > 500 (and our PageParam caps at 500). */
export const TMDB_MAX_PAGE = 500;

export function clampTotalPages(totalPages: number | undefined): number {
  return Math.min(totalPages ?? 1, TMDB_MAX_PAGE);
}

/** TMDB's /discover/tv sorts by first_air_date where /discover/movie uses primary_release_date. */
export function tmdbSortBy(type: "movie" | "tv", sortBy: string | undefined): string {
  const value = sortBy ?? "popularity.desc";
  if (type === "tv" && value.startsWith("primary_release_date.")) {
    return value.replace("primary_release_date.", "first_air_date.");
  }
  return value;
}
