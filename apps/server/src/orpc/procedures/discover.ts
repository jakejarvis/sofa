import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import { WATCH_REGION } from "@sofa/config";
import { getRecommendationsFeed } from "@sofa/core/discovery";
import { ensureBrowseTitlesExist } from "@sofa/core/metadata";
import { ensureBrowsePersonsExist } from "@sofa/core/person";
import { getPlatformTmdbIdMap, getPlatformTmdbIds, listPlatforms } from "@sofa/core/platforms";
import { getDisplayStatusesByTitleIds, getEpisodeProgressByTitleIds } from "@sofa/core/tracking";
import {
  discover as discoverTmdb,
  getGenres,
  getPopular,
  getTrending,
  searchMovies,
  searchMulti,
  searchPerson,
  searchTv,
} from "@sofa/tmdb/client";
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

// ─── Trending ─────────────────────────────────────────────────

export const trending = os.discover.trending.use(authed).handler(async ({ input, context }) => {
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
        posterPath: (r.poster_path as string) ?? null,
        releaseDate: (r.release_date as string | undefined) ?? null,
        firstAirDate: (r.first_air_date as string | undefined) ?? null,
        voteAverage: (r.vote_average as number | undefined) ?? null,
      };
    });
  const heroResult = results.find(
    (r) => r.backdrop_path && (r.media_type === "movie" || r.media_type === "tv"),
  );

  const allBrowseItems = [
    ...baseItems,
    ...(heroResult
      ? [
          {
            tmdbId: heroResult.id as number,
            type: heroResult.media_type as "movie" | "tv",
            title: ((heroResult.title ?? heroResult.name) as string | undefined) ?? "",
            posterPath: (heroResult.poster_path as string) ?? null,
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
    return Object.assign(item, {
      id: entry?.id ?? "",
      posterPath: tmdbImageUrl(item.posterPath, "posters"),
      posterThumbHash: entry?.posterThumbHash ?? null,
    });
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
          getDisplayStatusesByTitleIds(context.user.id, titleIds),
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

// ─── Popular ──────────────────────────────────────────────────

export const popular = os.discover.popular.use(authed).handler(async ({ input, context }) => {
  requireTmdb();

  const data = await getPopular(input.type, input.page);
  const baseItems = ((data.results ?? []) as Record<string, unknown>[])
    .filter((r) => r.poster_path)
    .map((r) => ({
      tmdbId: r.id as number,
      type: input.type,
      title: ((r.title ?? r.name) as string) || "",
      posterPath: (r.poster_path as string) ?? null,
      releaseDate: (r.release_date as string | undefined) ?? null,
      firstAirDate: (r.first_air_date as string | undefined) ?? null,
      voteAverage: (r.vote_average as number | undefined) ?? null,
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
    page: data.page ?? input.page,
    totalPages: data.total_pages ?? 1,
    totalResults: data.total_results ?? 0,
  };
});

// ─── Search ───────────────────────────────────────────────────

export const search = os.discover.search.use(authed).handler(async ({ input }) => {
  requireTmdb();

  const query = input.query.trim();
  if (!query) {
    return { results: [], page: 1, totalPages: 0, totalResults: 0 };
  }
  const type = input.type ?? null;

  if (type === "person") {
    const personResults = await searchPerson(query, input.page);
    const personItems = (personResults.results ?? []).map((r) => ({
      tmdbId: r.id,
      type: "person" as const,
      title: r.name ?? "",
      posterPath: null,
      profilePath: r.profile_path ?? null,
      overview: null,
      releaseDate: null,
      popularity: r.popularity ?? null,
      voteAverage: null,
      knownForDepartment: r.known_for_department ?? null,
      knownFor:
        (r.known_for
          ?.slice(0, 3)
          .map((k) => k.title ?? (k as { name?: string }).name)
          .filter((s): s is string => !!s) as string[]) ?? null,
    }));
    const personMap = ensureBrowsePersonsExist(
      personItems.map((r) => ({
        tmdbId: r.tmdbId,
        name: r.title,
        profilePath: r.profilePath,
        knownForDepartment: r.knownForDepartment,
        popularity: r.popularity,
      })),
    );
    return {
      results: personItems.map((r) =>
        Object.assign(r, {
          id: personMap.get(r.tmdbId),
          profilePath: tmdbImageUrl(r.profilePath, "profiles"),
        }),
      ),
      page: personResults.page ?? input.page,
      totalPages: personResults.total_pages ?? 1,
      totalResults: personResults.total_results ?? 0,
    };
  }

  const raw =
    type === "movie"
      ? await searchMovies(query, input.page)
      : type === "tv"
        ? await searchTv(query, input.page)
        : await searchMulti(query, input.page);

  type SearchResult = {
    id: number;
    media_type?: string;
    title?: string;
    name?: string;
    overview?: string;
    poster_path?: string | null;
    profile_path?: string | null;
    release_date?: string;
    first_air_date?: string;
    popularity?: number;
    vote_average?: number;
  };

  const mapped = ((raw.results ?? []) as SearchResult[])
    .map((r) => {
      if (r.media_type === "person") {
        return {
          tmdbId: r.id,
          type: "person" as const,
          title: r.name ?? "Unknown",
          posterPath: null,
          profilePath: r.profile_path ?? null,
          overview: null,
          releaseDate: null,
          popularity: r.popularity ?? null,
          voteAverage: null,
          knownForDepartment: null,
          knownFor: null,
        };
      }

      const mediaType = r.media_type === "movie" || r.media_type === "tv" ? r.media_type : type;
      if (!mediaType) return null;

      return {
        tmdbId: r.id,
        type: mediaType,
        title: r.title ?? r.name ?? "",
        overview: r.overview ?? null,
        releaseDate: r.release_date ?? r.first_air_date ?? null,
        posterPath: r.poster_path ?? null,
        profilePath: null,
        popularity: r.popularity ?? null,
        voteAverage: r.vote_average ?? null,
        knownForDepartment: null,
        knownFor: null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const titleResults = mapped.filter(
    (r): r is typeof r & { type: "movie" | "tv" } => r.type !== "person",
  );
  const titleMap = ensureBrowseTitlesExist(titleResults);

  const personResults = mapped.filter((r) => r.type === "person");
  const personMap = ensureBrowsePersonsExist(
    personResults.map((r) => ({
      tmdbId: r.tmdbId,
      name: r.title,
      profilePath: r.profilePath,
      knownForDepartment: r.knownForDepartment,
      popularity: r.popularity,
    })),
  );

  const results = mapped.map((r) => {
    if (r.type === "person") {
      return Object.assign(r, {
        id: personMap.get(r.tmdbId),
        profilePath: tmdbImageUrl(r.profilePath, "profiles"),
      });
    }
    const entry = titleMap.get(`${r.tmdbId}-${r.type}`);
    return Object.assign(r, { id: entry?.id, posterPath: tmdbImageUrl(r.posterPath, "posters") });
  });

  return {
    results,
    page: raw.page ?? input.page,
    totalPages: raw.total_pages ?? 1,
    totalResults: raw.total_results ?? 0,
  };
});

// ─── Browse (filtered discovery) ──────────────────────────────

export const browse = os.discover.browse.use(authed).handler(async ({ input, context }) => {
  requireTmdb();

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
  if (input.platformId) {
    const tmdbIds = getPlatformTmdbIds(input.platformId);
    if (tmdbIds.length > 0) {
      params.with_watch_providers = tmdbIds.join("|");
      params.watch_region = WATCH_REGION;
    }
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

// ─── Genres ───────────────────────────────────────────────────

export const genres = os.discover.genres.use(authed).handler(async ({ input }) => {
  requireTmdb();
  const data = await getGenres(input.type);
  return {
    genres: (data.genres ?? []).map((g) => ({
      id: g.id,
      name: g.name ?? "",
    })),
  };
});

// ─── Platforms ────────────────────────────────────────────────

export const platforms = os.discover.platforms.use(authed).handler(async () => {
  const allPlatforms = listPlatforms();
  const tmdbIdsMap = getPlatformTmdbIdMap(allPlatforms.map((p) => p.id));
  return {
    platforms: allPlatforms.map((p) => ({
      id: p.id,
      name: p.name,
      tmdbProviderIds: tmdbIdsMap.get(p.id) ?? [],
      logoPath: tmdbImageUrl(p.logoPath, "logos"),
      isSubscription: p.isSubscription,
    })),
  };
});

// ─── Recommendations ──────────────────────────────────────────

export const recommendations = os.discover.recommendations.use(authed).handler(({ context }) => {
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
