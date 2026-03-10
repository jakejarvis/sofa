import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { episodes } from "@/lib/db/schema";
import { logEpisodeWatchBatch, unwatchSeason } from "@/lib/services/tracking";
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
