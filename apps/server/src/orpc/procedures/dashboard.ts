import {
  getContinueWatchingFeed,
  getRecommendationsFeed,
  getUpcomingFeed,
  getUserStats,
  getWatchCount,
  getWatchHistory,
} from "@sofa/core/discovery";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { os } from "../context";
import { authed } from "../middleware";

const watchHistoryTypeMap = { movie: "movies", episode: "episodes" } as const;

export const stats = os.dashboard.stats.use(authed).handler(({ context }) => {
  return getUserStats(context.user.id);
});

export const continueWatching = os.dashboard.continueWatching.use(authed).handler(({ context }) => {
  const feed = getContinueWatchingFeed(context.user.id);
  const items = feed.map((item) => ({
    title: {
      id: item.title.id,
      title: item.title.title,
      backdropPath: tmdbImageUrl(item.title.backdropPath, "backdrops"),
      backdropThumbHash: item.title.backdropThumbHash,
    },
    nextEpisode: item.nextEpisode
      ? {
          seasonNumber: item.nextEpisode.seasonNumber,
          episodeNumber: item.nextEpisode.episodeNumber,
          name: item.nextEpisode.name,
          stillPath: tmdbImageUrl(item.nextEpisode.stillPath, "stills"),
          stillThumbHash: item.nextEpisode.stillThumbHash,
        }
      : null,
    totalEpisodes: item.totalEpisodes,
    watchedEpisodes: item.watchedEpisodes,
  }));
  return { items };
});

export const recommendations = os.dashboard.recommendations.use(authed).handler(({ context }) => {
  const feed = getRecommendationsFeed(context.user.id);
  const items = feed
    .filter((t): t is NonNullable<typeof t> => t != null)
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      tmdbId: t.tmdbId,
      type: t.type,
      title: t.title,
      posterPath: tmdbImageUrl(t.posterPath, "posters"),
      posterThumbHash: t.posterThumbHash ?? null,
      releaseDate: t.releaseDate ?? null,
      firstAirDate: t.firstAirDate ?? null,
      voteAverage: t.voteAverage,
    }));
  return { items };
});

export const upcoming = os.dashboard.upcoming.use(authed).handler(({ input, context }) => {
  const result = getUpcomingFeed(context.user.id, {
    days: input.days,
    limit: input.limit,
    cursor: input.cursor,
    mediaType: input.mediaType,
    statusFilter: input.statusFilter,
  });
  return {
    items: result.items.map((item) => ({
      ...item,
      posterPath: tmdbImageUrl(item.posterPath, "posters"),
      backdropPath: tmdbImageUrl(item.backdropPath, "backdrops"),
      streamingProvider: item.streamingProvider
        ? {
            ...item.streamingProvider,
            logoPath: tmdbImageUrl(item.streamingProvider.logoPath, "logos"),
          }
        : null,
    })),
    nextCursor: result.nextCursor,
  };
});

export const watchHistory = os.dashboard.watchHistory.use(authed).handler(({ input, context }) => {
  const coreType = watchHistoryTypeMap[input.type];
  const count = getWatchCount(context.user.id, coreType, input.period);
  const history = getWatchHistory(context.user.id, coreType, input.period);
  return { count, history };
});
