import { ORPCError } from "@orpc/server";
import { AppErrorCode } from "@sofa/api/errors";
import { ensureBrowseTitlesExist } from "@sofa/core/metadata";
import {
  getEpisodeProgressByTitleIds,
  getUserStatusesByTitleIds,
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
        data: { code: AppErrorCode.TMDB_NOT_CONFIGURED },
      });
    }

    const results = await discoverTmdb(
      input.type,
      {
        sort_by: "popularity.desc",
        "vote_count.gte": "50",
        with_genres: String(input.genreId),
      },
      input.page,
    );

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
        posterPath: tmdbImageUrl(r.poster_path ?? null, "posters"),
        releaseDate: (r.release_date as string | undefined) ?? null,
        firstAirDate: (r.first_air_date as string | undefined) ?? null,
        voteAverage: r.vote_average ?? null,
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
      page: results.page ?? input.page,
      totalPages: results.total_pages ?? 1,
      totalResults: results.total_results ?? 0,
    };
  });
