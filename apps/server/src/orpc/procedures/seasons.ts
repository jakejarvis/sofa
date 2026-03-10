import { logEpisodeWatchBatch, unwatchSeason } from "@sofa/core/tracking";
import { db } from "@sofa/db/client";
import { episodes } from "@sofa/db/schema";
import { eq } from "drizzle-orm";
import { os } from "../context";
import { authed } from "../middleware";

export const watch = os.seasons.watch
  .use(authed)
  .handler(({ input, context }) => {
    const seasonEps = db
      .select()
      .from(episodes)
      .where(eq(episodes.seasonId, input.id))
      .all();
    logEpisodeWatchBatch(
      context.user.id,
      seasonEps.map((ep) => ep.id),
    );
  });

export const unwatch = os.seasons.unwatch
  .use(authed)
  .handler(({ input, context }) => {
    unwatchSeason(context.user.id, input.id);
  });
