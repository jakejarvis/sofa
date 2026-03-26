import type { WatchScopeType } from "@sofa/api/schemas";
import { getWatchCount, getWatchHistory } from "@sofa/core/discovery";
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

// All tracking core functions are synchronous (bun:sqlite). If any become
// async, these loops need to be awaited to surface errors properly.
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

export const updateStatus = os.tracking.updateStatus
  .use(authed)
  .handler(async ({ input, context }) => {
    if (input.status === null) {
      removeTitleStatus(context.user.id, input.id);
      return;
    }

    // Auto-import from TMDB if the title is a shell (absorbs quickAdd logic)
    const result = quickAddTitle(context.user.id, input.id);
    if (result && !result.alreadyAdded) {
      getOrFetchTitleByTmdbId(result.tmdbId, result.type as "movie" | "tv").catch((err) => {
        log.warn(`Failed to import ${result.type} TMDB ${result.tmdbId}:`, err);
      });
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

export const stats = os.tracking.stats.use(authed).handler(({ input, context }) => {
  const coreType = watchHistoryTypeMap[input.type];
  const count = getWatchCount(context.user.id, coreType, input.period);
  const history = getWatchHistory(context.user.id, coreType, input.period);
  return { count, history };
});
