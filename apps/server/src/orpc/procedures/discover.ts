import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import { WATCH_REGION } from "@sofa/config";
import { ensureBrowseTitlesExist } from "@sofa/core/metadata";
import { getEpisodeProgressByTitleIds, getDisplayStatusesByTitleIds } from "@sofa/core/tracking";
import { discover as discoverTmdb } from "@sofa/tmdb/client";
import { isTmdbConfigured } from "@sofa/tmdb/config";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { os } from "../context";
import { authed } from "../middleware";

export const discover = os.discover.use(authed).handler(async ({ input, context }) => {
  if (!isTmdbConfigured()) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "TMDB API key is not configured",
      data: { code: AppErrorCode.TMDB_NOT_CONFIGURED },
    });
  }

  const params: Record<string, string> = {
    sort_by: input.sortBy ?? "popularity.desc",
    "vote_count.gte": "50",
  };
  if (input.genreId) params.with_genres = String(input.genreId);
  if (input.yearMin) {
    const key = input.type === "movie" ? "primary_release_date.gte" : "first_air_date.gte";
    params[key] = `${input.yearMin}-01-01`;
  }
  if (input.yearMax) {
    const key = input.type === "movie" ? "primary_release_date.lte" : "first_air_date.lte";
    params[key] = `${input.yearMax}-12-31`;
  }
  if (input.ratingMin != null) params["vote_average.gte"] = String(input.ratingMin);
  if (input.language) params.with_original_language = input.language;
  if (input.providerId) {
    params.with_watch_providers = String(input.providerId);
    params.watch_region = WATCH_REGION;
  }

  const results = await discoverTmdb(input.type, params, input.page);

  type DiscoverResult = NonNullable<typeof results.results>[number] & {
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
  };

  const baseItems = ((results.results ?? []) as DiscoverResult[])
    .filter((r) => r.poster_path)
    .map((r) => ({
      tmdbId: r.id,
      type: input.type,
      title: r.title ?? r.name ?? "",
      posterPath: r.poster_path ?? null,
      releaseDate: (r.release_date as string | undefined) ?? null,
      firstAirDate: (r.first_air_date as string | undefined) ?? null,
      voteAverage: r.vote_average ?? null,
    }));

  const titleMap = ensureBrowseTitlesExist(baseItems);
  const items = baseItems.map((item) => {
    const entry = titleMap.get(`${item.tmdbId}-${item.type}`);
    return Object.assign(item, {
      id: entry?.id ?? "",
      posterPath: tmdbImageUrl(item.posterPath, "posters"),
      posterThumbHash: entry?.posterThumbHash ?? null,
    });
  });

  const titleIds = items.map((r) => r.id);
  const [userStatuses, episodeProgress] =
    titleIds.length > 0
      ? [
          getDisplayStatusesByTitleIds(context.user.id, titleIds),
          getEpisodeProgressByTitleIds(context.user.id, titleIds),
        ]
      : [{}, {}];

  return {
    items,
    userStatuses,
    episodeProgress,
    page: results.page ?? input.page,
    totalPages: results.total_pages ?? 1,
    totalResults: results.total_results ?? 0,
  };
});
