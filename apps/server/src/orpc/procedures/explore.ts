import { ORPCError } from "@orpc/server";
import {
  getEpisodeProgressByTmdbIds,
  getUserStatusesByTmdbIds,
} from "@sofa/core/tracking";
import { getGenres, getPopular, getTrending } from "@sofa/tmdb/client";
import { isTmdbConfigured } from "@sofa/tmdb/config";
import { tmdbImageUrl } from "@sofa/tmdb/image";
import { os } from "../context";
import { authed } from "../middleware";
import {
  browseLookupKey,
  getBrowsePosterThumbHashes,
} from "./browse-thumbhashes";

function requireTmdb() {
  if (!isTmdbConfigured()) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "TMDB API key is not configured",
    });
  }
}

export const trending = os.explore.trending
  .use(authed)
  .handler(async ({ input, context }) => {
    requireTmdb();

    const data = await getTrending(input.type, "day");
    const results = (data.results ?? []) as Record<string, unknown>[];

    const baseItems = results
      .filter((r) => r.poster_path)
      .map((r) => {
        const mediaType =
          r.media_type === "movie" || r.media_type === "tv"
            ? r.media_type
            : "movie";
        return {
          tmdbId: r.id as number,
          type: mediaType as "movie" | "tv",
          title: ((r.title ?? r.name) as string) || "",
          posterPath: tmdbImageUrl(
            (r.poster_path as string) ?? null,
            "posters",
          ),
          releaseDate: (r.release_date as string | undefined) ?? null,
          firstAirDate: (r.first_air_date as string | undefined) ?? null,
          voteAverage: (r.vote_average as number | undefined) ?? null,
        };
      });
    const posterThumbHashes = getBrowsePosterThumbHashes(baseItems);
    const items = baseItems.map((item) => ({
      ...item,
      posterThumbHash: posterThumbHashes.get(browseLookupKey(item)) ?? null,
    }));

    const heroResult = results.find(
      (r) =>
        r.backdrop_path && (r.media_type === "movie" || r.media_type === "tv"),
    );
    const hero = heroResult
      ? {
          tmdbId: heroResult.id as number,
          type: heroResult.media_type as "movie" | "tv",
          title:
            ((heroResult.title ?? heroResult.name) as string | undefined) ?? "",
          overview: (heroResult.overview as string | undefined) ?? "",
          backdropPath: tmdbImageUrl(
            (heroResult.backdrop_path as string) ?? null,
            "backdrops",
          ),
          voteAverage: heroResult.vote_average as number,
        }
      : null;

    const lookups = items.map((r) => ({ tmdbId: r.tmdbId, type: r.type }));
    const [userStatuses, episodeProgress] =
      lookups.length > 0
        ? [
            getUserStatusesByTmdbIds(context.user.id, lookups),
            getEpisodeProgressByTmdbIds(context.user.id, lookups),
          ]
        : [{}, {}];

    return { items, hero, userStatuses, episodeProgress };
  });

export const popular = os.explore.popular
  .use(authed)
  .handler(async ({ input, context }) => {
    requireTmdb();

    const data = await getPopular(input.type);
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
    const posterThumbHashes = getBrowsePosterThumbHashes(baseItems);
    const items = baseItems.map((item) => ({
      ...item,
      posterThumbHash: posterThumbHashes.get(browseLookupKey(item)) ?? null,
    }));

    const lookups = items.map((r) => ({ tmdbId: r.tmdbId, type: r.type }));
    const [userStatuses, episodeProgress] =
      lookups.length > 0
        ? [
            getUserStatusesByTmdbIds(context.user.id, lookups),
            getEpisodeProgressByTmdbIds(context.user.id, lookups),
          ]
        : [{}, {}];

    return { items, userStatuses, episodeProgress };
  });

export const genres = os.explore.genres
  .use(authed)
  .handler(async ({ input }) => {
    requireTmdb();
    const data = await getGenres(input.type);
    return {
      genres: (data.genres ?? []).map((g) => ({
        id: g.id,
        name: g.name ?? "",
      })),
    };
  });
