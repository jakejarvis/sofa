import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import type { WatchScopeType } from "@sofa/api/schemas";
import { getWatchCount, getWatchHistory } from "@sofa/core/discovery";
import { getOrFetchTitleByTmdbId } from "@sofa/core/metadata";
import {
  getDisplayStatusesByTitleIds,
  deleteWatch as deleteWatchRecord,
  getUserTitleInfo,
  listWatchHistory,
  logEpisodeWatch,
  logEpisodeWatchBatch,
  logMovieWatch,
  logWatchAt,
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
import { tmdbImageUrl } from "@sofa/tmdb/image";

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
      return { alreadyAdded: false };
    }

    // Auto-import from TMDB if the title is a shell (absorbs quickAdd logic)
    const result = quickAddTitle(context.user.id, input.id);
    if (!result) {
      throw new ORPCError("NOT_FOUND", {
        message: "Title not found",
        data: { code: AppErrorCode.TITLE_NOT_FOUND },
      });
    }
    if (!result.alreadyAdded) {
      getOrFetchTitleByTmdbId(result.tmdbId, result.type as "movie" | "tv").catch((err) => {
        log.warn(`Failed to import ${result.type} TMDB ${result.tmdbId}:`, err);
      });
    }

    return { alreadyAdded: result.alreadyAdded };
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

export const history = os.tracking.history.use(authed).handler(({ input, context }) => {
  const result = listWatchHistory(context.user.id, input);
  return {
    items: result.items.map((item) => ({
      watchId: item.watchId,
      kind: item.kind,
      watchedAt: item.watchedAt.toISOString(),
      source: item.source,
      title: {
        ...item.title,
        posterPath: tmdbImageUrl(item.title.posterPath, "posters"),
      },
      episode: item.episode,
    })),
    nextCursor: result.nextCursor,
  };
});

export const deleteWatch = os.tracking.deleteWatch.use(authed).handler(({ input, context }) => {
  if (!deleteWatchRecord(context.user.id, input.kind, input.watchId)) {
    throw new ORPCError("NOT_FOUND", {
      message: "Watch not found",
      data: { code: AppErrorCode.WATCH_NOT_FOUND },
    });
  }
});

export const logWatch = os.tracking.logWatch.use(authed).handler(({ input, context }) => {
  const result = logWatchAt(context.user.id, input.kind, input.id, new Date(input.watchedAt));
  if (result === "not_found") {
    const code =
      input.kind === "movie" ? AppErrorCode.TITLE_NOT_FOUND : AppErrorCode.EPISODE_NOT_FOUND;
    throw new ORPCError("NOT_FOUND", {
      message: code === AppErrorCode.TITLE_NOT_FOUND ? "Title not found" : "Episode not found",
      data: { code },
    });
  }
});
