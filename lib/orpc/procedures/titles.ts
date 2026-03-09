import { ORPCError } from "@orpc/server";
import { getRecommendationsForTitle } from "@/lib/services/discovery";
import {
  getOrFetchTitle,
  getOrFetchTitleByTmdbId,
} from "@/lib/services/metadata";
import {
  getUserTitleInfo,
  logMovieWatch,
  markAllEpisodesWatched,
  rateTitleStars,
  removeTitleStatus,
  setTitleStatus,
} from "@/lib/services/tracking";
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
  .handler(({ input }) => {
    return { recommendations: getRecommendationsForTitle(input.id) };
  });
