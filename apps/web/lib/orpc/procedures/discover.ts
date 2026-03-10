import { ORPCError } from "@orpc/server";
import { isTmdbConfigured } from "@/lib/config";
import {
  getEpisodeProgressByTmdbIds,
  getUserStatusesByTmdbIds,
} from "@/lib/services/tracking";
import { discover } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { os } from "../context";
import { authed } from "../middleware";

export const discoverProcedure = os.discover
  .use(authed)
  .handler(async ({ input, context }) => {
    if (!isTmdbConfigured()) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "TMDB API key is not configured.",
      });
    }

    const results = await discover(input.mediaType, {
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
        type: input.mediaType,
        title: r.title ?? r.name ?? "",
        posterPath: tmdbImageUrl(r.poster_path ?? null, "posters"),
        releaseDate: r.release_date ?? r.first_air_date ?? null,
        voteAverage: r.vote_average,
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
