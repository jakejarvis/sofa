import {
  logEpisodeWatch,
  logEpisodeWatchBatch,
  unwatchEpisode,
} from "@sofa/core/tracking";
import { os } from "../context";
import { authed } from "../middleware";

export const watch = os.episodes.watch
  .use(authed)
  .handler(({ input, context }) => {
    logEpisodeWatch(context.user.id, input.id);
  });

export const unwatch = os.episodes.unwatch
  .use(authed)
  .handler(({ input, context }) => {
    unwatchEpisode(context.user.id, input.id);
  });

export const batchWatch = os.episodes.batchWatch
  .use(authed)
  .handler(({ input, context }) => {
    logEpisodeWatchBatch(context.user.id, input.episodeIds);
  });
