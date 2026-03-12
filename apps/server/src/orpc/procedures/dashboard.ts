import {
  getContinueWatchingFeed,
  getNewAvailableFeed,
  getRecommendationsFeed,
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

export const continueWatching = os.dashboard.continueWatching
  .use(authed)
  .handler(({ context }) => {
    const feed = getContinueWatchingFeed(context.user.id);
    const items = feed.map((item) => ({
      title: {
        id: item.title.id,
        title: item.title.title,
        backdropPath: tmdbImageUrl(item.title.backdropPath, "backdrops"),
      },
      nextEpisode: item.nextEpisode
        ? {
            seasonNumber: item.nextEpisode.seasonNumber,
            episodeNumber: item.nextEpisode.episodeNumber,
            name: item.nextEpisode.name,
            stillPath: tmdbImageUrl(item.nextEpisode.stillPath, "stills"),
          }
        : null,
      totalEpisodes: item.totalEpisodes,
      watchedEpisodes: item.watchedEpisodes,
    }));
    return { items };
  });

export const library = os.dashboard.library
  .use(authed)
  .handler(({ context }) => {
    const feed = getNewAvailableFeed(context.user.id);
    const items = feed.slice(0, 10).map((t) => ({
      id: t.titleId,
      tmdbId: t.tmdbId,
      type: t.type,
      title: t.title,
      posterPath: tmdbImageUrl(t.posterPath, "posters"),
      releaseDate: t.releaseDate ?? null,
      firstAirDate: t.firstAirDate ?? null,
      voteAverage: t.voteAverage,
      userStatus: t.userStatus,
    }));
    return { items };
  });

export const recommendations = os.dashboard.recommendations
  .use(authed)
  .handler(({ context }) => {
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
        releaseDate: t.releaseDate ?? null,
        firstAirDate: t.firstAirDate ?? null,
        voteAverage: t.voteAverage,
      }));
    return { items };
  });

export const watchHistory = os.dashboard.watchHistory
  .use(authed)
  .handler(({ input, context }) => {
    const coreType = watchHistoryTypeMap[input.type];
    const count = getWatchCount(context.user.id, coreType, input.period);
    const history = getWatchHistory(context.user.id, coreType, input.period);
    return { count, history };
  });
