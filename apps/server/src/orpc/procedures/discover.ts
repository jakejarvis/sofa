import { ORPCError } from "@orpc/server";
import {
  getEpisodeProgressByTmdbIds,
  getUserStatusesByTmdbIds,
} from "@sofa/core/tracking";
import { discover as discoverTmdb } from "@sofa/tmdb/client";
import { isTmdbConfigured } from "@sofa/tmdb/config";
import { tmdbImageUrl } from "@sofa/tmdb/image";
import { os } from "../context";
import { authed } from "../middleware";

export const discover = os.discover
  .use(authed)
  .handler(async ({ input, context }) => {
    if (!isTmdbConfigured()) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "TMDB API key is not configured",
      });
    }

    const results = await discoverTmdb(input.type, {
      sort_by: "popularity.desc",
      "vote_count.gte": "50",
      with_genres: String(input.genreId),
    });

    type DiscoverResult = NonNullable<typeof results.results>[number] & {
      title?: string;
      name?: string;
      release_date?: string;
      first_air_date?: string;
    };

    const items = ((results.results ?? []) as DiscoverResult[])
      .filter((r) => r.poster_path)
      .map((r) => ({
        tmdbId: r.id,
        type: input.type,
        title: r.title ?? r.name ?? "",
        posterPath: tmdbImageUrl(r.poster_path ?? null, "posters"),
        releaseDate: (r.release_date as string | undefined) ?? null,
        firstAirDate: (r.first_air_date as string | undefined) ?? null,
        voteAverage: r.vote_average ?? null,
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
