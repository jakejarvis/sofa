import { ORPCError } from "@orpc/server";
import { getRecommendationsForTitle } from "@sofa/core/discovery";
import {
  ensureTvHydrated,
  getOrFetchTitle,
  getOrFetchTitleByTmdbId,
} from "@sofa/core/metadata";
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
import { userTitleStatus } from "@sofa/db/schema";
import { os } from "../context";
import { authed } from "../middleware";

export const detail = os.titles.detail
  .use(authed)
  .handler(async ({ input }) => {
    const result = await getOrFetchTitle(input.id);
    if (!result)
      throw new ORPCError("NOT_FOUND", { message: "Title not found" });
    return result;
  });

export const resolve = os.titles.resolve
  .use(authed)
  .handler(async ({ input }) => {
    const title = await getOrFetchTitleByTmdbId(input.tmdbId, input.type);
    if (!title)
      throw new ORPCError("NOT_FOUND", { message: "Title not found" });
    return { id: title.id };
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

export const hydrateSeasons = os.titles.hydrateSeasons
  .use(authed)
  .handler(async ({ input }) => {
    const seasons = await ensureTvHydrated(input.id, input.tmdbId);
    return { seasons };
  });

export const quickAdd = os.titles.quickAdd
  .use(authed)
  .handler(async ({ input, context }) => {
    const title = await getOrFetchTitleByTmdbId(input.tmdbId, input.type);
    if (!title) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to import title",
      });
    }

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
