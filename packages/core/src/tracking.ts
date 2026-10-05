import { getTitlesByIds } from "@sofa/db/queries/discovery";
import { getTitleById } from "@sofa/db/queries/title";
import {
  batchInsertEpisodeWatchesTransaction,
  batchInsertMissingEpisodeWatches,
  countDistinctEpisodeWatches,
  deleteAllEpisodeWatchesForTitle,
  deleteEpisodeWatch,
  deleteEpisodeWatches,
  deleteMovieWatches,
  deleteRating,
  deleteTitleStatus,
  getAllEpisodeIdsForTitle,
  getEpisodeProgressByTitleIds as getEpisodeProgressByTitleIdsQuery,
  getEpisodeTitleId,
  getEpisodeTitleIds,
  getEpisodeWatchHistory,
  getExistingEpisodeWatchIds,
  getMovieWatchHistory,
  getSeasonById,
  getSeasonEpisodeIds,
  getTitleStatus,
  getUserStatusesByTitleIds as getUserStatusesByTitleIdsQuery,
  getUserTitleInfo as getUserTitleInfoQuery,
  insertEpisodeWatch,
  insertMovieWatch,
  upsertRating,
  upsertTitleStatus,
} from "@sofa/db/queries/tracking";

import type { DisplayStatus } from "./display-status";
import { getDisplayStatus } from "./display-status";

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

  // Find the title for this episode
  const titleId = getEpisodeTitleId(episodeId);
  if (!titleId) return;

  // Auto-set status to in_progress if not set or still on watchlist
  const existing = getTitleStatus(userId, titleId);

  if (!existing || existing.status === "watchlist") {
    setTitleStatus(userId, titleId, "in_progress", source);
  }
}

export function logEpisodeWatchBatch(
  userId: string,
  episodeIds: string[],
  source: "manual" | "import" | "plex" | "jellyfin" | "emby" = "manual",
  watchedAt?: Date,
) {
  if (episodeIds.length === 0) return;

  batchInsertEpisodeWatchesTransaction(userId, episodeIds, source, watchedAt);

  // Auto-set title status to in_progress for affected titles
  const episodeTitleMap = getEpisodeTitleIds(episodeIds);
  const titleIds = new Set(episodeTitleMap.values());
  for (const titleId of titleIds) {
    const existing = getTitleStatus(userId, titleId);
    if (!existing || existing.status === "watchlist") {
      setTitleStatus(userId, titleId, "in_progress", source);
    }
  }
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

  // TV never stores 'completed' — set in_progress and let display status derive the rest
  setTitleStatus(userId, titleId, "in_progress", source);
}

export function unwatchEpisode(userId: string, episodeId: string) {
  deleteEpisodeWatch(userId, episodeId);

  const titleId = getEpisodeTitleId(episodeId);
  if (!titleId) return;

  const existing = getTitleStatus(userId, titleId);
  if (!existing || existing.status !== "in_progress") return;

  // If no episodes remain watched, downgrade to watchlist
  const epIds = getAllEpisodeIdsForTitle(titleId);
  const watchCount = countDistinctEpisodeWatches(userId, epIds);
  if (watchCount === 0) {
    setTitleStatus(userId, titleId, "watchlist");
  }
}

export function unwatchSeason(userId: string, seasonId: string) {
  const epIds = getSeasonEpisodeIds(seasonId);
  if (epIds.length > 0) {
    deleteEpisodeWatches(userId, epIds);
  }

  const season = getSeasonById(seasonId);
  if (!season) return;

  const existing = getTitleStatus(userId, season.titleId);
  if (!existing || existing.status !== "in_progress") return;

  // If no episodes remain watched, downgrade to watchlist
  const allEpIds = getAllEpisodeIdsForTitle(season.titleId);
  const watchCount = countDistinctEpisodeWatches(userId, allEpIds);
  if (watchCount === 0) {
    setTitleStatus(userId, season.titleId, "watchlist");
  }
}

export function unwatchMovie(userId: string, titleId: string) {
  deleteMovieWatches(userId, titleId);

  const existing = getTitleStatus(userId, titleId);
  if (existing && existing.status !== "watchlist") {
    setTitleStatus(userId, titleId, "watchlist");
  }
}

export function unwatchSeries(userId: string, titleId: string) {
  deleteAllEpisodeWatchesForTitle(userId, titleId);

  const existing = getTitleStatus(userId, titleId);
  if (existing && existing.status !== "watchlist") {
    setTitleStatus(userId, titleId, "watchlist");
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

/**
 * Derive display statuses for a set of titles.
 * Resolves stored status + episode progress + TMDB show status into display status.
 */
export function getDisplayStatusesByTitleIds(
  userId: string,
  titleIds: string[],
): Record<string, DisplayStatus> {
  if (titleIds.length === 0) return {};

  const storedStatuses = getUserStatusesByTitleIds(userId, titleIds);
  const statusEntries = Object.entries(storedStatuses);
  if (statusEntries.length === 0) return {};

  // Find TV titles with in_progress status that need episode progress resolution
  const tvInProgressIds = statusEntries
    .filter(([, status]) => status === "in_progress")
    .map(([id]) => id);

  // Fetch title data for type + TMDB status
  const trackedIds = statusEntries.map(([id]) => id);
  const titles = getTitlesByIds(trackedIds);
  const titleMap = new Map(titles.map((t) => [t.id, t]));

  // Fetch episode progress for TV in_progress titles
  const episodeProgress =
    tvInProgressIds.length > 0 ? getEpisodeProgressByTitleIds(userId, tvInProgressIds) : {};

  const result: Record<string, DisplayStatus> = {};
  for (const [titleId, storedStatus] of statusEntries) {
    const title = titleMap.get(titleId);
    const titleType = (title?.type ?? "movie") as "movie" | "tv";
    const tmdbStatus = title?.status ?? null;
    const progress = episodeProgress[titleId] ?? null;

    result[titleId] = getDisplayStatus(storedStatus, titleType, tmdbStatus, progress);
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
  logEpisodeWatchBatch(userId, getSeasonEpisodeIds(seasonId));
}

// ─── Watch history timeline ─────────────────────────────────────────

type WatchSource = "manual" | "import" | "plex" | "jellyfin" | "emby";

interface WatchHistoryCursorKey {
  /** watchedAt in epoch ms */
  t: number;
  /** watch row id */
  i: string;
}

function encodeWatchHistoryCursor(key: WatchHistoryCursorKey): string {
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

function decodeWatchHistoryCursor(cursor: string): WatchHistoryCursorKey | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof parsed?.t !== "number" ||
      !Number.isFinite(parsed.t) ||
      typeof parsed?.i !== "string"
    ) {
      return null;
    }
    return { t: parsed.t, i: parsed.i };
  } catch {
    return null;
  }
}

export interface WatchHistoryEntry {
  watchId: string;
  kind: "movie" | "episode";
  watchedAt: Date;
  source: WatchSource;
  title: {
    id: string;
    title: string;
    type: "movie" | "tv";
    posterPath: string | null;
    posterThumbHash: string | null;
  };
  episode: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
  } | null;
}

/**
 * One page of the user's watch history (movies + episodes merged), newest first.
 * Keyset-paginated on (watchedAt desc, id desc). Image paths are raw DB paths.
 */
export function listWatchHistory(
  userId: string,
  input: { limit: number; cursor?: string; type?: "movie" | "tv"; source?: WatchSource },
): { items: WatchHistoryEntry[]; nextCursor: string | null } {
  const { limit, type, source } = input;
  const key = input.cursor ? decodeWatchHistoryCursor(input.cursor) : null;
  const opts = {
    limit: limit + 1,
    source,
    before: key ? { watchedAt: new Date(key.t), id: key.i } : undefined,
  };

  const entries: WatchHistoryEntry[] = [];

  if (type !== "tv") {
    for (const r of getMovieWatchHistory(userId, opts)) {
      entries.push({
        watchId: r.watchId,
        kind: "movie",
        watchedAt: r.watchedAt,
        source: r.source,
        title: {
          id: r.titleId,
          title: r.title,
          type: r.type,
          posterPath: r.posterPath,
          posterThumbHash: r.posterThumbHash,
        },
        episode: null,
      });
    }
  }

  if (type !== "movie") {
    for (const r of getEpisodeWatchHistory(userId, opts)) {
      entries.push({
        watchId: r.watchId,
        kind: "episode",
        watchedAt: r.watchedAt,
        source: r.source,
        title: {
          id: r.titleId,
          title: r.title,
          type: r.type,
          posterPath: r.posterPath,
          posterThumbHash: r.posterThumbHash,
        },
        episode: {
          id: r.episodeId,
          seasonNumber: r.seasonNumber,
          episodeNumber: r.episodeNumber,
          name: r.episodeName,
        },
      });
    }
  }

  entries.sort(
    (a, b) =>
      b.watchedAt.getTime() - a.watchedAt.getTime() ||
      (a.watchId < b.watchId ? 1 : a.watchId > b.watchId ? -1 : 0),
  );

  const hasMore = entries.length > limit;
  const items = entries.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeWatchHistoryCursor({ t: last.watchedAt.getTime(), i: last.watchId })
        : null,
  };
}
