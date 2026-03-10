import { ORPCError } from "@orpc/server";
import { getOrFetchTitleByTmdbId } from "@sofa/core/metadata";
import { setTitleStatus } from "@sofa/core/tracking";
import { db } from "@sofa/db/client";
import { and, eq } from "@sofa/db/helpers";
import { userTitleStatus } from "@sofa/db/schema";
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
