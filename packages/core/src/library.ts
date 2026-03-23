import {
  getFilteredLibrary,
  getLibraryGenres,
  type LibraryFilters,
} from "@sofa/db/queries/library";

import { getDisplayStatusesByTitleIds } from "./tracking";

export type { LibraryFilters };

export function getFilteredLibraryFeed(userId: string, filters: LibraryFilters) {
  const result = getFilteredLibrary(userId, filters);

  const titleIds = result.items.map((i) => i.titleId);
  const displayStatuses = getDisplayStatusesByTitleIds(userId, titleIds);

  return {
    items: result.items.map((item) => ({
      titleId: item.titleId,
      title: item.title,
      type: item.type,
      tmdbId: item.tmdbId,
      posterPath: item.posterPath,
      posterThumbHash: item.posterThumbHash,
      releaseDate: item.releaseDate,
      firstAirDate: item.firstAirDate,
      voteAverage: item.voteAverage,
      userStatus: displayStatuses[item.titleId] ?? null,
      userRating: item.userRating ?? null,
    })),
    page: result.page,
    totalPages: result.totalPages,
    totalResults: result.totalResults,
  };
}

export function getLibraryGenresList(userId: string) {
  return getLibraryGenres(userId);
}
