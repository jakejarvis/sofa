import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userTitleStatus } from "@/lib/db/schema";
import { getOrFetchTitleByTmdbId } from "@/lib/services/metadata";
import { setTitleStatus } from "@/lib/services/tracking";
import { os } from "../context";
import { authed } from "../middleware";

export const quickAdd = os.watchlist.quickAdd
  .use(authed)
  .handler(async ({ input, context }) => {
    const title = await getOrFetchTitleByTmdbId(input.tmdbId, input.type);
    if (!title) {
      throw new ORPCError("BAD_GATEWAY", {
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
