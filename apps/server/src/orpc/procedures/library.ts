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
