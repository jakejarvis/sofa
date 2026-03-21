import type { SofaExport } from "@sofa/api/schemas";
import {
  getUserEpisodeWatches,
  getUserLibrary,
  getUserMovieWatches,
  getUserRatings,
} from "@sofa/db/queries/export";

function extractYear(
  releaseDate?: string | null,
  firstAirDate?: string | null,
): number | undefined {
  const dateStr = releaseDate ?? firstAirDate;
  if (!dateStr) return undefined;
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}

export function generateUserExport(
  userId: string,
  user: { name: string; email: string },
): SofaExport {
  const libraryRows = getUserLibrary(userId);
  const movieWatchRows = getUserMovieWatches(userId);
  const episodeWatchRows = getUserEpisodeWatches(userId);
  const ratingRows = getUserRatings(userId);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { name: user.name, email: user.email },
    library: libraryRows.map((row) => ({
      tmdbId: row.tmdbId,
      title: row.title,
      year: extractYear(row.year, row.firstAirDate),
      type: row.type as "movie" | "tv",
      status: row.status as "watchlist" | "in_progress" | "completed",
      addedAt: row.addedAt.toISOString(),
    })),
    movieWatches: movieWatchRows.map((row) => ({
      tmdbId: row.tmdbId,
      title: row.title,
      year: extractYear(row.year),
      watchedAt: row.watchedAt.toISOString(),
    })),
    episodeWatches: episodeWatchRows.map((row) => ({
      showTmdbId: row.showTmdbId,
      showTitle: row.showTitle,
      showYear: extractYear(row.showFirstAirDate),
      seasonNumber: row.seasonNumber,
      episodeNumber: row.episodeNumber,
      episodeName: row.episodeName ?? undefined,
      watchedAt: row.watchedAt.toISOString(),
    })),
    ratings: ratingRows.map((row) => ({
      tmdbId: row.tmdbId,
      title: row.title,
      year: extractYear(row.year, row.firstAirDate),
      type: row.type as "movie" | "tv",
      rating: row.ratingStars,
      ratedAt: row.ratedAt.toISOString(),
    })),
  };
}
