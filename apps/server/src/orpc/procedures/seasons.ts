import { unwatchSeason, watchSeason } from "@sofa/core/tracking";

import { os } from "../context";
import { authed } from "../middleware";

export const watch = os.seasons.watch.use(authed).handler(({ input, context }) => {
  watchSeason(context.user.id, input.id);
});

export const unwatch = os.seasons.unwatch.use(authed).handler(({ input, context }) => {
  unwatchSeason(context.user.id, input.id);
});
