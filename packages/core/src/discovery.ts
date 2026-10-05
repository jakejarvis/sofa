import { localDateString } from "@sofa/config";
import {
  getAllTrackedTitleIds,
  getAvailabilityByTitleIds,
  getEngagedTitleIds,
  getEpisodesBySeasonIds,
  getEpisodeWatchCountSince,
  getEpisodeWatchesByEpisodeIds,
  getEpisodeWatchHistoryBuckets,
  getHighlyRatedTitleIds,
  getInProgressTitleIds,
  getMovieWatchCountSince,
  getMovieWatchHistoryBuckets,
  getRecommendationRows,
  getRecommendationRowsForTitle,
  getSeasonsByTitleIds,
  getTitleByIdOrNull,
  getTitlesByIds,
  getTvTitlesByIds,
  getRecentUnwatchedEpisodes,
  getUpcomingEpisodes,
  getUpcomingMovies,
  getUserStatusCounts,
} from "@sofa/db/queries/discovery";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import type { DisplayStatus } from "./display-status";
import { getDisplayStatusesByTitleIds } from "./tracking";

export type TimePeriod = "today" | "this_week" | "this_month" | "this_year";

export function periodStartTimestamp(period: TimePeriod): number {
  const now = new Date();
  const start = new Date(now);
  switch (period) {
    case "today":
      start.setHours(now.getHours() - 24, now.getMinutes(), 0, 0);
      break;
    case "this_week":
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "this_month":
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "this_year":
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return Math.floor(start.getTime() / 1000);
}

export function getWatchCount(
  userId: string,
  table: "movies" | "episodes",
  period: TimePeriod,
): number {
  const timestamp = periodStartTimestamp(period);
  if (table === "movies") {
    return getMovieWatchCountSince(userId, timestamp);
  }
  return getEpisodeWatchCountSince(userId, timestamp);
}

export interface HistoryBucket {
  bucket: string;
  count: number;
}

function toLocalDateBucket(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWatchHistory(
  userId: string,
  table: "movies" | "episodes",
  period: TimePeriod,
): HistoryBucket[] {
  const startTs = periodStartTimestamp(period);
  const now = new Date();

  let fmt: string;
  let buckets: string[];

  switch (period) {
    case "today":
      fmt = "%H";
      buckets = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(now);
        d.setHours(now.getHours() - 23 + i);
        return d.getHours().toString().padStart(2, "0");
      });
      break;
    case "this_week": {
      fmt = "%Y-%m-%d";
      buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - 6 + i);
        return toLocalDateBucket(d);
      });
      break;
    }
    case "this_month": {
      fmt = "%Y-%m-%d";
      buckets = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - 29 + i);
        return toLocalDateBucket(d);
      });
      break;
    }
    case "this_year":
      fmt = "%Y-%m";
      buckets = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(now.getMonth() - 11 + i);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      });
      break;
  }

  const rows =
    table === "movies"
      ? getMovieWatchHistoryBuckets(userId, startTs, fmt)
      : getEpisodeWatchHistoryBuckets(userId, startTs, fmt);

  const countMap = new Map(rows.map((r) => [r.bucket, r.count]));
  return buckets.map((b) => ({ bucket: b, count: countMap.get(b) ?? 0 }));
}

export interface DashboardStats {
  moviesThisMonth: number;
  episodesThisWeek: number;
  librarySize: number;
  completed: number;
}

export function getUserStats(userId: string): DashboardStats {
  const moviesThisMonth = getWatchCount(userId, "movies", "this_month");
  const episodesThisWeek = getWatchCount(userId, "episodes", "this_week");

  const statusCounts = getUserStatusCounts(userId);

  return {
    moviesThisMonth,
    episodesThisWeek,
    librarySize: statusCounts?.librarySize ?? 0,
    completed: statusCounts?.completed ?? 0,
  };
}

export interface ContinueWatchingItem {
  title: {
    id: string;
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    backdropThumbHash: string | null;
    type: string;
  };
  nextEpisode: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
    stillPath: string | null;
    stillThumbHash: string | null;
    overview: string | null;
  } | null;
  lastWatchedAt: Date | null;
  totalEpisodes: number;
  watchedEpisodes: number;
}

export function getContinueWatchingFeed(userId: string): ContinueWatchingItem[] {
  // Get in-progress TV shows
  const inProgress = getInProgressTitleIds(userId);

  if (inProgress.length === 0) return [];

  const titleIds = inProgress.map((r) => r.titleId);

  // Batch fetch all TV titles (1 query)
  const tvTitles = getTvTitlesByIds(titleIds);

  if (tvTitles.length === 0) return [];

  const tvTitleIds = tvTitles.map((t) => t.id);
  const titleMap = new Map(tvTitles.map((t) => [t.id, t]));

  // Batch fetch all seasons for these titles (1 query)
  const allSeasons = getSeasonsByTitleIds(tvTitleIds);

  const seasonIds = allSeasons.map((s) => s.id);

  // Batch fetch all episodes for these seasons (1 query)
  const allEpisodes = getEpisodesBySeasonIds(seasonIds);

  // Batch fetch all watches for this user for these episodes (1 query)
  const episodeIds = allEpisodes.map((ep) => ep.id);
  const allWatches = getEpisodeWatchesByEpisodeIds(userId, episodeIds);

  // Build lookup maps
  const watchedEpisodeIds = new Set(allWatches.map((w) => w.episodeId));
  const watchDateMap = new Map<string, Date>();
  for (const watch of allWatches) {
    const existing = watchDateMap.get(watch.episodeId);
    if (!existing || watch.watchedAt > existing) {
      watchDateMap.set(watch.episodeId, watch.watchedAt);
    }
  }

  // Group seasons by title
  const seasonsByTitle = new Map<string, typeof allSeasons>();
  for (const s of allSeasons) {
    const arr = seasonsByTitle.get(s.titleId) ?? [];
    arr.push(s);
    seasonsByTitle.set(s.titleId, arr);
  }

  // Group episodes by season
  const episodesBySeason = new Map<string, typeof allEpisodes>();
  for (const ep of allEpisodes) {
    const arr = episodesBySeason.get(ep.seasonId) ?? [];
    arr.push(ep);
    episodesBySeason.set(ep.seasonId, arr);
  }

  const items: ContinueWatchingItem[] = [];
  const today = localDateString();
  const isAired = (airDate: string | null) => airDate != null && airDate <= today;

  for (const row of inProgress) {
    const title = titleMap.get(row.titleId);
    if (!title) continue;

    const titleSeasonsArr = seasonsByTitle.get(title.id) ?? [];
    let nextEpisode: ContinueWatchingItem["nextEpisode"] = null;
    let lastWatchedAt: Date | null = null;
    let totalEpisodes = 0;
    let watchedEpisodes = 0;

    for (const s of titleSeasonsArr) {
      const eps = episodesBySeason.get(s.id) ?? [];

      for (const ep of eps) {
        const aired = isAired(ep.airDate);
        if (watchedEpisodeIds.has(ep.id)) {
          const watchDate = watchDateMap.get(ep.id);
          if (watchDate && (!lastWatchedAt || watchDate > lastWatchedAt)) {
            lastWatchedAt = watchDate;
          }
          if (aired) {
            totalEpisodes++;
            watchedEpisodes++;
          }
        } else if (aired) {
          totalEpisodes++;
          if (!nextEpisode) {
            nextEpisode = {
              id: ep.id,
              seasonNumber: s.seasonNumber,
              episodeNumber: ep.episodeNumber,
              name: ep.name,
              stillPath: ep.stillPath,
              stillThumbHash: ep.stillThumbHash,
              overview: ep.overview,
            };
          }
        }
      }
    }

    if (nextEpisode) {
      items.push({
        title: {
          id: title.id,
          title: title.title,
          posterPath: title.posterPath,
          backdropPath: title.backdropPath,
          backdropThumbHash: title.backdropThumbHash,
          type: title.type,
        },
        nextEpisode,
        lastWatchedAt,
        totalEpisodes,
        watchedEpisodes,
      });
    }
  }

  // Sort by most recent watch
  items.sort((a, b) => {
    const aTime = a.lastWatchedAt?.getTime() ?? 0;
    const bTime = b.lastWatchedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return items;
}

export { getNewAvailableFeed } from "@sofa/db/queries/discovery";

export function getRecommendationsFeed(userId: string) {
  // Get recommendations from user's highly-rated or completed titles
  const userCompletedOrRated = getEngagedTitleIds(userId);

  const ratedIds = getHighlyRatedTitleIds(userId);

  const sourceIds = [...new Set([...userCompletedOrRated, ...ratedIds])];
  if (sourceIds.length === 0) return [];

  // Get all tracked title IDs to exclude
  const trackedIds = new Set(getAllTrackedTitleIds(userId));

  // Batch fetch all recommendations for all source IDs (1 query)
  const allRecRows = getRecommendationRows(sourceIds);

  const recs: Map<string, { titleId: string; score: number }> = new Map();

  for (const rec of allRecRows) {
    if (trackedIds.has(rec.recommendedTitleId)) continue;
    const existing = recs.get(rec.recommendedTitleId);
    const score = 100 - rec.rank;
    if (existing) {
      existing.score += score;
    } else {
      recs.set(rec.recommendedTitleId, {
        titleId: rec.recommendedTitleId,
        score,
      });
    }
  }

  const sorted = recs
    .values()
    .toArray()
    .toSorted((a, b) => b.score - a.score)
    .slice(0, 20);

  if (sorted.length === 0) return [];

  // Batch fetch all recommended titles (1 query)
  const recTitleIds = sorted.map((r) => r.titleId);
  const recTitles = getTitlesByIds(recTitleIds);
  const recTitleMap = new Map(recTitles.map((t) => [t.id, t]));

  return sorted.map((r) => recTitleMap.get(r.titleId)).filter(Boolean);
}

// ─── Upcoming feed ──────────────────────────────────────────────────

export interface UpcomingItem {
  episodeId: string | null;
  titleId: string;
  titleName: string;
  titleType: "movie" | "tv";
  posterPath: string | null;
  posterThumbHash: string | null;
  backdropPath: string | null;
  backdropThumbHash: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeName: string | null;
  episodeCount: number;
  date: string;
  userStatus: DisplayStatus;
  isNewSeason: boolean;
  streamingProvider: {
    platformId: string;
    providerName: string;
    logoPath: string | null;
  } | null;
}

export interface UpcomingFeedResult {
  items: UpcomingItem[];
  nextCursor: string | null;
}

/** Sort/cursor key for one upcoming feed item. `s`/`e` are 0 for movies. */
interface UpcomingCursorKey {
  d: string; // date YYYY-MM-DD
  n: string; // title name
  i: string; // title id
  s: number; // season number
  e: number; // episode number
}

function compareUpcomingKeys(a: UpcomingCursorKey, b: UpcomingCursorKey): number {
  return (
    a.d.localeCompare(b.d) ||
    a.n.localeCompare(b.n) ||
    a.i.localeCompare(b.i) ||
    a.s - b.s ||
    a.e - b.e
  );
}

/** Same as compareUpcomingKeys, but dates descend (newest first). */
function compareRecentKeys(a: UpcomingCursorKey, b: UpcomingCursorKey): number {
  return (
    b.d.localeCompare(a.d) ||
    a.n.localeCompare(b.n) ||
    a.i.localeCompare(b.i) ||
    a.s - b.s ||
    a.e - b.e
  );
}

function encodeUpcomingCursor(key: UpcomingCursorKey): string {
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

function decodeUpcomingCursor(cursor: string): UpcomingCursorKey | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof parsed?.d !== "string" ||
      typeof parsed?.n !== "string" ||
      typeof parsed?.i !== "string"
    ) {
      return null;
    }
    return {
      d: parsed.d,
      n: parsed.n,
      i: parsed.i,
      s: typeof parsed.s === "number" ? parsed.s : 0,
      e: typeof parsed.e === "number" ? parsed.e : 0,
    };
  } catch {
    return null;
  }
}

export function getUpcomingFeed(
  userId: string,
  options: {
    days?: number;
    limit?: number;
    cursor?: string;
    mediaType?: "movie" | "tv";
    statusFilter?: ("watching" | "watchlist")[];
    direction?: "upcoming" | "recent";
  } = {},
): UpcomingFeedResult {
  const {
    days = 90,
    limit = 20,
    cursor,
    mediaType,
    statusFilter,
    direction = "upcoming",
  } = options;
  const isRecent = direction === "recent";
  const compareKeys = isRecent ? compareRecentKeys : compareUpcomingKeys;

  // Map display status filter to stored statuses for DB query
  const storedStatuses = statusFilter?.map((s) => (s === "watching" ? "in_progress" : s));

  const now = new Date();
  const today = localDateString(now);
  const cursorKey = cursor ? decodeUpcomingCursor(cursor) : null;

  let episodeRows: ReturnType<typeof getUpcomingEpisodes>;
  let movieRows: ReturnType<typeof getUpcomingMovies>;
  if (isRecent) {
    // Dates go down: the cursor date is the upper bound, `days` ago the lower bound.
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const earliest = new Date(now);
    earliest.setDate(earliest.getDate() - days);
    const toDate = cursorKey?.d ?? localDateString(yesterdayDate);
    const fromDate = localDateString(earliest);
    episodeRows = mediaType === "movie" ? [] : getRecentUnwatchedEpisodes(userId, fromDate, toDate);
    movieRows = [];
  } else {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + days);
    const toDate = localDateString(horizon);

    // Use the cursor date as the lower bound so later pages skip already-seen dates,
    // but don't apply a DB-level LIMIT so same-day items aren't truncated.
    const fromDate = cursorKey?.d ?? today;
    episodeRows =
      mediaType === "movie" ? [] : getUpcomingEpisodes(userId, fromDate, toDate, storedStatuses);
    movieRows =
      mediaType === "tv" ? [] : getUpcomingMovies(userId, fromDate, toDate, storedStatuses);
  }

  // Merge into unified items
  type RawItem = {
    date: string;
    titleId: string;
    titleName: string;
    key: UpcomingCursorKey;
  } & (
    | { type: "tv"; row: (typeof episodeRows)[number] }
    | { type: "movie"; row: (typeof movieRows)[number] }
  );

  const merged: RawItem[] = [
    ...episodeRows.map((r) => ({
      date: r.airDate!,
      titleId: r.titleId,
      titleName: r.titleName,
      key: {
        d: r.airDate!,
        n: r.titleName,
        i: r.titleId,
        s: r.seasonNumber,
        e: r.episodeNumber,
      },
      type: "tv" as const,
      row: r,
    })),
    ...movieRows.map((r) => ({
      date: r.releaseDate!,
      titleId: r.titleId,
      titleName: r.titleName,
      key: { d: r.releaseDate!, n: r.titleName, i: r.titleId, s: 0, e: 0 },
      type: "movie" as const,
      row: r,
    })),
  ];

  // Sort by (date, title, titleId, season, episode) ASC — the same key the cursor uses
  merged.sort((a, b) => compareKeys(a.key, b.key));

  // Collapse batch drops: group 3+ episodes from the same title on the same date into one item
  const collapsed: (RawItem & { episodeCount: number })[] = [];
  let i = 0;
  while (i < merged.length) {
    const current = merged[i]!;
    if (current.type === "tv") {
      // Count consecutive episodes with the same (titleId, date)
      let groupEnd = i + 1;
      while (
        groupEnd < merged.length &&
        merged[groupEnd]!.type === "tv" &&
        merged[groupEnd]!.titleId === current.titleId &&
        merged[groupEnd]!.date === current.date
      ) {
        groupEnd++;
      }
      const groupSize = groupEnd - i;
      if (groupSize >= 3) {
        // Collapse: keep first item with episodeCount and clear episode name
        collapsed.push({ ...current, episodeCount: groupSize });
        i = groupEnd;
      } else {
        // Keep individual items
        for (let j = i; j < groupEnd; j++) {
          collapsed.push({ ...merged[j]!, episodeCount: 1 });
        }
        i = groupEnd;
      }
    } else {
      collapsed.push({ ...current, episodeCount: 1 });
      i++;
    }
  }

  // Apply cursor: skip items at or before the cursor position.
  // Cursor is base64url-encoded UTF-8 JSON {d, n, i, s, e} matching the sort key.
  let startIdx = 0;
  if (cursorKey) {
    startIdx = collapsed.findIndex((item) => compareKeys(item.key, cursorKey) > 0);
    if (startIdx === -1) startIdx = collapsed.length;
  }

  const pageItems = collapsed.slice(startIdx, startIdx + limit);
  const hasMore = startIdx + limit < collapsed.length;

  // Compute cursor from the last item on this page
  let nextCursor: string | null = null;
  if (hasMore && pageItems.length > 0) {
    const last = pageItems.at(-1)!;
    nextCursor = encodeUpcomingCursor(last.key);
  }

  // Batch-fetch display statuses and streaming providers
  const titleIds = [...new Set(pageItems.map((item) => item.titleId))];
  const displayStatuses = getDisplayStatusesByTitleIds(userId, titleIds);
  const providerRows = getAvailabilityByTitleIds(titleIds);
  const providerMap = new Map<
    string,
    { platformId: string; providerName: string; logoPath: string | null }
  >();
  for (const p of providerRows) {
    if (!providerMap.has(p.titleId)) {
      providerMap.set(p.titleId, {
        platformId: p.platformId,
        providerName: p.providerName,
        logoPath: p.logoPath,
      });
    }
  }

  const items: UpcomingItem[] = pageItems.map((item) => {
    if (item.type === "tv") {
      const r = item.row;
      const isCollapsed = item.episodeCount > 1;
      return {
        episodeId: isCollapsed ? null : r.episodeId,
        titleId: r.titleId,
        titleName: r.titleName,
        titleType: "tv",
        posterPath: r.posterPath,
        posterThumbHash: r.posterThumbHash,
        backdropPath: r.backdropPath ?? null,
        backdropThumbHash: r.backdropThumbHash ?? null,
        seasonNumber: r.seasonNumber,
        episodeNumber: r.episodeNumber,
        episodeName: isCollapsed ? null : r.episodeName,
        episodeCount: item.episodeCount,
        date: r.airDate!,
        userStatus: displayStatuses[r.titleId] ?? "watching",
        isNewSeason:
          (displayStatuses[r.titleId] === "caught_up" ||
            displayStatuses[r.titleId] === "completed") &&
          r.episodeNumber === 1,
        streamingProvider: providerMap.get(r.titleId) ?? null,
      };
    }
    const r = item.row;
    return {
      episodeId: null,
      titleId: r.titleId,
      titleName: r.titleName,
      titleType: "movie",
      posterPath: r.posterPath,
      posterThumbHash: r.posterThumbHash,
      backdropPath: r.backdropPath ?? null,
      backdropThumbHash: r.backdropThumbHash ?? null,
      seasonNumber: null,
      episodeNumber: null,
      episodeName: null,
      episodeCount: 1,
      date: r.releaseDate!,
      userStatus: displayStatuses[r.titleId] ?? "in_watchlist",
      isNewSeason: false,
      streamingProvider: providerMap.get(r.titleId) ?? null,
    };
  });

  return { items, nextCursor };
}

export function getRecommendationsForTitle(titleId: string) {
  const title = getTitleByIdOrNull(titleId);
  if (!title) return [];

  const recs = getRecommendationRowsForTitle(titleId);

  if (recs.length === 0) return [];

  const sourcePriority = {
    tmdb_recommendations: 0,
    tmdb_similar: 1,
  } as const;
  const orderedRecs = recs.toSorted(
    (a, b) => a.rank - b.rank || sourcePriority[a.source] - sourcePriority[b.source],
  );

  const seenRecommendedTitleIds = new Set<string>();
  const uniqueRecs = orderedRecs.filter((rec) => {
    if (seenRecommendedTitleIds.has(rec.recommendedTitleId)) {
      return false;
    }
    seenRecommendedTitleIds.add(rec.recommendedTitleId);
    return true;
  });

  // Batch fetch all recommended titles (1 query)
  const recTitleIds = uniqueRecs.map((r) => r.recommendedTitleId);
  const recTitles = getTitlesByIds(recTitleIds);
  const recTitleMap = new Map(recTitles.map((t) => [t.id, t]));

  return uniqueRecs
    .map((rec) => {
      const r = recTitleMap.get(rec.recommendedTitleId);
      if (!r) return null;
      return {
        id: r.id,
        tmdbId: r.tmdbId,
        type: r.type as "movie" | "tv",
        title: r.title,
        posterPath: tmdbImageUrl(r.posterPath, "posters"),
        posterThumbHash: r.posterThumbHash,
        releaseDate: r.releaseDate,
        firstAirDate: r.firstAirDate,
        voteAverage: r.voteAverage,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}
