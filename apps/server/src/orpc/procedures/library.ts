import { getContinueWatchingFeed, getUserStats, getUpcomingFeed } from "@sofa/core/discovery";
import { getFilteredLibraryFeed, getLibraryGenresList } from "@sofa/core/library";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { os } from "../context";
import { authed } from "../middleware";

export const list = os.library.list.use(authed).handler(({ input, context }) => {
  const result = getFilteredLibraryFeed(context.user.id, {
    search: input.search,
    statuses: input.statuses,
    type: input.type,
    genreId: input.genreId,
    ratingMin: input.ratingMin,
    ratingMax: input.ratingMax,
    yearMin: input.yearMin,
    yearMax: input.yearMax,
    contentRating: input.contentRating,
    onMyServices: input.onMyServices,
    sortBy: input.sortBy,
    sortDirection: input.sortDirection,
    page: input.page,
    limit: input.limit,
  });

  return {
    items: result.items.map((item) => ({
      id: item.titleId,
      tmdbId: item.tmdbId,
      type: item.type,
      title: item.title,
      posterPath: tmdbImageUrl(item.posterPath, "posters"),
      posterThumbHash: item.posterThumbHash ?? null,
      releaseDate: item.releaseDate ?? null,
      firstAirDate: item.firstAirDate ?? null,
      voteAverage: item.voteAverage,
      userStatus: item.userStatus,
      userRating: item.userRating,
    })),
    page: result.page,
    totalPages: result.totalPages,
    totalResults: result.totalResults,
  };
});

export const genres = os.library.genres.use(authed).handler(({ context }) => {
  return { genres: getLibraryGenresList(context.user.id) };
});

export const stats = os.library.stats.use(authed).handler(({ context }) => {
  const userStats = getUserStats(context.user.id);
  return { size: userStats.librarySize, completed: userStats.completed };
});

export const continueWatching = os.library.continueWatching.use(authed).handler(({ context }) => {
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

export const upcoming = os.library.upcoming.use(authed).handler(({ input, context }) => {
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
