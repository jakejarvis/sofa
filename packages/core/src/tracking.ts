import { getTitleById } from "@sofa/db/queries/title";
import {
  batchInsertEpisodeWatchesTransaction,
  batchInsertMissingEpisodeWatches,
  countDistinctEpisodeWatches,
  deleteEpisodeWatch,
  deleteEpisodeWatches,
  deleteRating,
  deleteTitleStatus,
  getAllEpisodeIdsForTitle,
  getEpisodeProgressByTitleIds as getEpisodeProgressByTitleIdsQuery,
  getEpisodeTitleId,
  getExistingEpisodeWatchIds,
  getSeasonById,
  getSeasonEpisodes,
  getTitleStatus,
  getUserStatusesByTitleIds as getUserStatusesByTitleIdsQuery,
  getUserTitleInfo as getUserTitleInfoQuery,
  insertEpisodeWatch,
  insertMovieWatch,
  upsertRating,
  upsertTitleStatus,
} from "@sofa/db/queries/tracking";

export function setTitleStatus(
  userId: string,
  titleId: string,
  status: "watchlist" | "in_progress" | "completed",
  _source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
  addedAt?: Date,
) {
  upsertTitleStatus(userId, titleId, status, addedAt);
}

export function removeTitleStatus(userId: string, titleId: string) {
  deleteTitleStatus(userId, titleId);
}

export function logMovieWatch(
  userId: string,
  titleId: string,
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
  watchedAt?: Date,
) {
  const now = watchedAt ?? new Date();
  insertMovieWatch(userId, titleId, now, source);

  // Auto-set status to completed
  const existing = getTitleStatus(userId, titleId);

  if (!existing) {
    setTitleStatus(userId, titleId, "completed", source);
  } else if (existing.status !== "completed") {
    setTitleStatus(userId, titleId, "completed", source);
  }
}

export function logEpisodeWatch(
  userId: string,
  episodeId: string,
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
  watchedAt?: Date,
) {
  const now = watchedAt ?? new Date();
  insertEpisodeWatch(userId, episodeId, now, source);

  // Find the title for this episode (single JOIN instead of 2 queries)
  const titleId = getEpisodeTitleId(episodeId);
  if (!titleId) return;

  // Auto-set status to in_progress if not set
  const existing = getTitleStatus(userId, titleId);

  if (!existing || existing.status === "watchlist") {
    setTitleStatus(userId, titleId, "in_progress", source);
  }

  // Check if all episodes are watched -> auto-complete
  checkAllEpisodesWatched(userId, titleId);
}

export function logEpisodeWatchBatch(
  userId: string,
  episodeIds: string[],
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
  watchedAt?: Date,
) {
  if (episodeIds.length === 0) return;

  batchInsertEpisodeWatchesTransaction(userId, episodeIds, source, watchedAt);
}

export function markAllEpisodesWatched(
  userId: string,
  titleId: string,
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
) {
  const title = getTitleById(titleId);
  if (!title || title.type !== "tv") return;

  const now = new Date();
  const epIds = getAllEpisodeIdsForTitle(titleId);
  const existingWatches = getExistingEpisodeWatchIds(userId, epIds);

  batchInsertMissingEpisodeWatches(userId, epIds, existingWatches, source, now);

  setTitleStatus(userId, titleId, "completed", source);
}

function checkAllEpisodesWatched(userId: string, titleId: string) {
  const epIds = getAllEpisodeIdsForTitle(titleId);

  const totalEpisodes = epIds.length;
  if (totalEpisodes === 0) return;

  const watchCount = countDistinctEpisodeWatches(userId, epIds);

  if (watchCount >= totalEpisodes) {
    setTitleStatus(userId, titleId, "completed");
  }
}

export function unwatchEpisode(userId: string, episodeId: string) {
  deleteEpisodeWatch(userId, episodeId);

  // Find parent title and downgrade from completed to in_progress
  const titleId = getEpisodeTitleId(episodeId);
  if (!titleId) return;

  const existing = getTitleStatus(userId, titleId);

  if (existing?.status === "completed") {
    setTitleStatus(userId, titleId, "in_progress");
  }
}

export function unwatchSeason(userId: string, seasonId: string) {
  const seasonEps = getSeasonEpisodes(seasonId);

  const epIds = seasonEps.map((ep) => ep.id);
  if (epIds.length > 0) {
    deleteEpisodeWatches(userId, epIds);
  }

  // Find parent title and downgrade from completed to in_progress
  const season = getSeasonById(seasonId);
  if (!season) return;

  const existing = getTitleStatus(userId, season.titleId);

  if (existing?.status === "completed") {
    setTitleStatus(userId, season.titleId, "in_progress");
  }
}

export function rateTitleStars(
  userId: string,
  titleId: string,
  ratingStars: number,
  ratedAt?: Date,
) {
  const now = ratedAt ?? new Date();
  if (ratingStars === 0) {
    deleteRating(userId, titleId);
    return;
  }
  upsertRating(userId, titleId, ratingStars, now);
}

export function getUserStatusesByTitleIds(
  userId: string,
  titleIds: string[],
): Record<string, "watchlist" | "in_progress" | "completed"> {
  if (titleIds.length === 0) return {};

  const rows = getUserStatusesByTitleIdsQuery(userId, titleIds);

  const result: Record<string, "watchlist" | "in_progress" | "completed"> = {};
  for (const row of rows) {
    result[row.titleId] = row.status as "watchlist" | "in_progress" | "completed";
  }
  return result;
}

export function getEpisodeProgressByTitleIds(
  userId: string,
  titleIds: string[],
): Record<string, { watched: number; total: number }> {
  if (titleIds.length === 0) return {};

  const rows = getEpisodeProgressByTitleIdsQuery(userId, titleIds);

  const result: Record<string, { watched: number; total: number }> = {};
  for (const row of rows) {
    if (row.watchedEpisodes > 0) {
      result[row.titleId] = {
        watched: row.watchedEpisodes,
        total: row.totalEpisodes,
      };
    }
  }
  return result;
}

export function getUserTitleInfo(userId: string, titleId: string) {
  return getUserTitleInfoQuery(userId, titleId);
}

export function quickAddTitle(
  userId: string,
  titleId: string,
): { id: string; tmdbId: number; type: string; alreadyAdded: boolean } | null {
  const title = getTitleById(titleId);
  if (!title) return null;

  const existing = getTitleStatus(userId, titleId);

  if (!existing) {
    setTitleStatus(userId, titleId, "watchlist");
  }

  return { id: title.id, tmdbId: title.tmdbId, type: title.type, alreadyAdded: !!existing };
}

export function watchSeason(userId: string, seasonId: string): void {
  const seasonEps = getSeasonEpisodes(seasonId);
  logEpisodeWatchBatch(
    userId,
    seasonEps.map((ep) => ep.id),
  );
}
