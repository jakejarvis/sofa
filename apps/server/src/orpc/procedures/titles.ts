import { ORPCError } from "@orpc/server";
import { AppErrorCode } from "@sofa/api/errors";
import { getRecommendationsForTitle } from "@sofa/core/discovery";
import { getOrFetchTitle, getOrFetchTitleByTmdbId } from "@sofa/core/metadata";
import {
  getUserStatusesByTitleIds,
  getUserTitleInfo,
  logMovieWatch,
  markAllEpisodesWatched,
  rateTitleStars,
  removeTitleStatus,
  setTitleStatus,
} from "@sofa/core/tracking";
import { db } from "@sofa/db/client";
import { and, eq } from "@sofa/db/helpers";
import { titles, userTitleStatus } from "@sofa/db/schema";
import { os } from "../context";
import { authed } from "../middleware";

export const detail = os.titles.detail
  .use(authed)
  .handler(async ({ input }) => {
    const result = await getOrFetchTitle(input.id);
    if (!result)
      throw new ORPCError("NOT_FOUND", {
        message: "Title not found",
        data: { code: AppErrorCode.TITLE_NOT_FOUND },
      });
    return result;
  });

export const updateStatus = os.titles.updateStatus
  .use(authed)
  .handler(({ input, context }) => {
    if (input.status === null) {
      removeTitleStatus(context.user.id, input.id);
    } else {
      setTitleStatus(context.user.id, input.id, input.status);
    }
  });

export const updateRating = os.titles.updateRating
  .use(authed)
  .handler(({ input, context }) => {
    rateTitleStars(context.user.id, input.id, input.stars);
  });

export const watchMovie = os.titles.watchMovie
  .use(authed)
  .handler(({ input, context }) => {
    logMovieWatch(context.user.id, input.id);
  });

export const watchAll = os.titles.watchAll
  .use(authed)
  .handler(({ input, context }) => {
    markAllEpisodesWatched(context.user.id, input.id);
  });

export const userInfo = os.titles.userInfo
  .use(authed)
  .handler(({ input, context }) => {
    return getUserTitleInfo(context.user.id, input.id);
  });

export const recommendations = os.titles.recommendations
  .use(authed)
  .handler(({ input, context }) => {
    const recs = getRecommendationsForTitle(input.id);
    const userStatuses = getUserStatusesByTitleIds(
      context.user.id,
      recs.map((r) => r.id),
    );
    return { recommendations: recs, userStatuses };
  });

export const quickAdd = os.titles.quickAdd
  .use(authed)
  .handler(async ({ input, context }) => {
    // Look up the title (it exists as a shell from browse/search import)
    const title = db
      .select({ id: titles.id, tmdbId: titles.tmdbId, type: titles.type })
      .from(titles)
      .where(eq(titles.id, input.id))
      .get();
    if (!title) {
      throw new ORPCError("NOT_FOUND", {
        message: "Title not found",
        data: { code: AppErrorCode.TITLE_NOT_FOUND },
      });
    }

    // Trigger full TMDB import if still a shell
    getOrFetchTitleByTmdbId(title.tmdbId, title.type as "movie" | "tv").catch(
      () => {},
    );

    const existing = db
      .select()
      .from(userTitleStatus)
      .where(
        and(
          eq(userTitleStatus.userId, context.user.id),
          eq(userTitleStatus.titleId, title.id),
        ),
      )
      .get();

    if (!existing) {
      setTitleStatus(context.user.id, title.id, "watchlist");
    }

    return { id: title.id, alreadyAdded: !!existing };
  });
