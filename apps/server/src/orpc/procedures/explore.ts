import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import { ensureBrowseTitlesExist } from "@sofa/core/metadata";
import { getEpisodeProgressByTitleIds, getUserStatusesByTitleIds } from "@sofa/core/tracking";
import { getGenres, getPopular, getTrending } from "@sofa/tmdb/client";
import { isTmdbConfigured } from "@sofa/tmdb/config";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { os } from "../context";
import { authed } from "../middleware";

function requireTmdb() {
  if (!isTmdbConfigured()) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "TMDB API key is not configured",
      data: { code: AppErrorCode.TMDB_NOT_CONFIGURED },
    });
  }
}

export const trending = os.explore.trending.use(authed).handler(async ({ input, context }) => {
  requireTmdb();

  const data = await getTrending(input.type, "day", input.page);
  const results = (data.results ?? []) as Record<string, unknown>[];

  const baseItems = results
    .filter((r) => r.poster_path)
    .map((r) => {
      const mediaType = r.media_type === "movie" || r.media_type === "tv" ? r.media_type : "movie";
      return {
        tmdbId: r.id as number,
        type: mediaType as "movie" | "tv",
        title: ((r.title ?? r.name) as string) || "",
        posterPath: tmdbImageUrl((r.poster_path as string) ?? null, "posters"),
        releaseDate: (r.release_date as string | undefined) ?? null,
        firstAirDate: (r.first_air_date as string | undefined) ?? null,
        voteAverage: (r.vote_average as number | undefined) ?? null,
      };
    });
  const heroResult = results.find(
    (r) => r.backdrop_path && (r.media_type === "movie" || r.media_type === "tv"),
  );

  // Batch-upsert all browse items (+ hero) into the titles table
  const allBrowseItems = [
    ...baseItems,
    ...(heroResult
      ? [
          {
            tmdbId: heroResult.id as number,
            type: heroResult.media_type as "movie" | "tv",
            title: ((heroResult.title ?? heroResult.name) as string | undefined) ?? "",
            posterPath: tmdbImageUrl((heroResult.poster_path as string) ?? null, "posters"),
            releaseDate: (heroResult.release_date as string | undefined) ?? null,
            firstAirDate: (heroResult.first_air_date as string | undefined) ?? null,
            voteAverage: (heroResult.vote_average as number | undefined) ?? null,
          },
        ]
      : []),
  ];
  const titleMap = ensureBrowseTitlesExist(allBrowseItems);

  const items = baseItems.map((item) => {
    const entry = titleMap.get(`${item.tmdbId}-${item.type}`);
    return {
      ...item,
      id: entry?.id ?? "",
      posterThumbHash: entry?.posterThumbHash ?? null,
    };
  });

  const heroEntry = heroResult
    ? titleMap.get(`${heroResult.id as number}-${heroResult.media_type as string}`)
    : undefined;
  const hero = heroResult
    ? {
        id: heroEntry?.id ?? "",
        tmdbId: heroResult.id as number,
        type: heroResult.media_type as "movie" | "tv",
        title: ((heroResult.title ?? heroResult.name) as string | undefined) ?? "",
        overview: (heroResult.overview as string | undefined) ?? "",
        backdropPath: tmdbImageUrl((heroResult.backdrop_path as string) ?? null, "backdrops"),
        voteAverage: heroResult.vote_average as number,
      }
    : null;

  const titleIds = items.map((r) => r.id);
  const [userStatuses, episodeProgress] =
    titleIds.length > 0
      ? [
          getUserStatusesByTitleIds(context.user.id, titleIds),
          getEpisodeProgressByTitleIds(context.user.id, titleIds),
        ]
      : [{}, {}];

  return {
    items,
    hero,
    userStatuses,
    episodeProgress,
    page: (data as { page?: number }).page ?? input.page,
    totalPages: (data as { total_pages?: number }).total_pages ?? 1,
    totalResults: (data as { total_results?: number }).total_results ?? 0,
  };
});

export const popular = os.explore.popular.use(authed).handler(async ({ input, context }) => {
  requireTmdb();

  const data = await getPopular(input.type, input.page);
  const baseItems = ((data.results ?? []) as Record<string, unknown>[])
    .filter((r) => r.poster_path)
    .map((r) => ({
      tmdbId: r.id as number,
      type: input.type,
      title: ((r.title ?? r.name) as string) || "",
      posterPath: tmdbImageUrl((r.poster_path as string) ?? null, "posters"),
      releaseDate: (r.release_date as string | undefined) ?? null,
      firstAirDate: (r.first_air_date as string | undefined) ?? null,
      voteAverage: (r.vote_average as number | undefined) ?? null,
    }));

  const titleMap = ensureBrowseTitlesExist(baseItems);
  const items = baseItems.map((item) => {
    const entry = titleMap.get(`${item.tmdbId}-${item.type}`);
    return {
      ...item,
      id: entry?.id ?? "",
      posterThumbHash: entry?.posterThumbHash ?? null,
    };
  });

  const titleIds = items.map((r) => r.id);
  const [userStatuses, episodeProgress] =
    titleIds.length > 0
      ? [
          getUserStatusesByTitleIds(context.user.id, titleIds),
          getEpisodeProgressByTitleIds(context.user.id, titleIds),
        ]
      : [{}, {}];

  return {
    items,
    userStatuses,
    episodeProgress,
    page: data.page ?? input.page,
    totalPages: data.total_pages ?? 1,
    totalResults: data.total_results ?? 0,
  };
});

export const genres = os.explore.genres.use(authed).handler(async ({ input }) => {
  requireTmdb();
  const data = await getGenres(input.type);
  return {
    genres: (data.genres ?? []).map((g) => ({
      id: g.id,
      name: g.name ?? "",
    })),
  };
});
