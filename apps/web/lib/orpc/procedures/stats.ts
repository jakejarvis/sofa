import { getWatchCount, getWatchHistory } from "@/lib/services/discovery";
import { os } from "../context";
import { authed } from "../middleware";

export const statsProcedure = os.stats
  .use(authed)
  .handler(({ input, context }) => {
    const count = getWatchCount(context.user.id, input.type, input.period);
    const history = getWatchHistory(context.user.id, input.type, input.period);
    return { count, history };
  });
