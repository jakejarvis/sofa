import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import type { WatchScopeType } from "@sofa/api/schemas";
import { getUserStats, getWatchCount, getWatchHistory } from "@sofa/core/discovery";
import { getOrFetchTitleByTmdbId } from "@sofa/core/metadata";
import {
  getDisplayStatusesByTitleIds,
  getUserTitleInfo,
  logEpisodeWatch,
  logEpisodeWatchBatch,
  logMovieWatch,
  markAllEpisodesWatched,
  quickAddTitle,
  rateTitleStars,
  removeTitleStatus,
  setTitleStatus,
  unwatchEpisode,
  unwatchMovie,
  unwatchSeason,
  unwatchSeries,
  watchSeason,
} from "@sofa/core/tracking";
import { createLogger } from "@sofa/logger";

import { os } from "../context";
import { authed } from "../middleware";

const log = createLogger("tracking");

const watchHistoryTypeMap = { movie: "movies", episode: "episodes" } as const;

// ─── Watch handlers by scope ──────────────────────────────────

function handleWatch(userId: string, scope: WatchScopeType, ids: string[]) {
  switch (scope) {
    case "movie":
      for (const id of ids) logMovieWatch(userId, id);
      break;
    case "episode":
      if (ids.length === 1) {
        logEpisodeWatch(userId, ids[0]);
      } else {
        logEpisodeWatchBatch(userId, ids);
      }
      break;
    case "season":
      for (const id of ids) watchSeason(userId, id);
      break;
    case "series":
      for (const id of ids) markAllEpisodesWatched(userId, id);
      break;
  }
}

function handleUnwatch(userId: string, scope: WatchScopeType, ids: string[]) {
  switch (scope) {
    case "movie":
      for (const id of ids) unwatchMovie(userId, id);
      break;
    case "episode":
      for (const id of ids) unwatchEpisode(userId, id);
      break;
    case "season":
      for (const id of ids) unwatchSeason(userId, id);
      break;
    case "series":
      for (const id of ids) unwatchSeries(userId, id);
      break;
  }
}

// ─── Procedures ───────────────────────────────────────────────

export const watch = os.tracking.watch.use(authed).handler(({ input, context }) => {
  handleWatch(context.user.id, input.scope, input.ids);
});

export const unwatch = os.tracking.unwatch.use(authed).handler(({ input, context }) => {
  handleUnwatch(context.user.id, input.scope, input.ids);
});

export const updateStatus = os.tracking.updateStatus.use(authed).handler(({ input, context }) => {
  if (input.status === null) {
    removeTitleStatus(context.user.id, input.id);
  } else {
    setTitleStatus(context.user.id, input.id, input.status);
  }
});

export const rate = os.tracking.rate.use(authed).handler(({ input, context }) => {
  rateTitleStars(context.user.id, input.id, input.stars);
});

export const userInfo = os.tracking.userInfo.use(authed).handler(({ input, context }) => {
  const info = getUserTitleInfo(context.user.id, input.id);
  if (!info.status) return { ...info, status: null };

  const displayStatuses = getDisplayStatusesByTitleIds(context.user.id, [input.id]);
  return { ...info, status: displayStatuses[input.id] ?? null };
});

export const quickAdd = os.tracking.quickAdd.use(authed).handler(async ({ input, context }) => {
  const result = quickAddTitle(context.user.id, input.id);
  if (!result) {
    throw new ORPCError("NOT_FOUND", {
      message: "Title not found",
      data: { code: AppErrorCode.TITLE_NOT_FOUND },
    });
  }

  // Trigger full TMDB import if still a shell (fire-and-forget)
  getOrFetchTitleByTmdbId(result.tmdbId, result.type as "movie" | "tv").catch((err) => {
    log.warn(`Failed to import ${result.type} TMDB ${result.tmdbId}:`, err);
  });

  return { id: result.id, alreadyAdded: result.alreadyAdded };
});

export const stats = os.tracking.stats.use(authed).handler(({ context }) => {
  return getUserStats(context.user.id);
});

export const history = os.tracking.history.use(authed).handler(({ input, context }) => {
  const coreType = watchHistoryTypeMap[input.type];
  const count = getWatchCount(context.user.id, coreType, input.period);
  const watchHistory = getWatchHistory(context.user.id, coreType, input.period);
  return { count, history: watchHistory };
});
