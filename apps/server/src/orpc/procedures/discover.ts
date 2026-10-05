import {
  assertTmdbConfigured,
  browseCatalog,
  getPopularFeed,
  getTmdbGenres,
  getTrendingFeed,
  searchCatalog,
} from "@sofa/core/browse";
import { getRecommendationsFeed } from "@sofa/core/discovery";
import { getPlatformTmdbIdMap, listPlatforms } from "@sofa/core/platforms";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { os } from "../context";
import { authed } from "../middleware";

// ─── Trending ─────────────────────────────────────────────────

export const trending = os.discover.trending.use(authed).handler(({ input, context }) => {
  assertTmdbConfigured();
  return getTrendingFeed(context.user.id, input);
});

// ─── Popular ──────────────────────────────────────────────────

export const popular = os.discover.popular.use(authed).handler(({ input, context }) => {
  assertTmdbConfigured();
  return getPopularFeed(context.user.id, input);
});

// ─── Search ───────────────────────────────────────────────────

export const search = os.discover.search.use(authed).handler(({ input }) => {
  assertTmdbConfigured();
  return searchCatalog(input);
});

// ─── Browse (filtered discovery) ──────────────────────────────

export const browse = os.discover.browse.use(authed).handler(({ input, context }) => {
  assertTmdbConfigured();
  return browseCatalog(context.user.id, input);
});

// ─── Genres ───────────────────────────────────────────────────

export const genres = os.discover.genres.use(authed).handler(({ input }) => {
  assertTmdbConfigured();
  return getTmdbGenres(input.type);
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
