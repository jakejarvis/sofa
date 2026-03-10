import { getWatchCount, getWatchHistory } from "@sofa/core/discovery";
import { os } from "../context";
import { authed } from "../middleware";

export const stats = os.stats.use(authed).handler(({ input, context }) => {
  const count = getWatchCount(context.user.id, input.type, input.period);
  const history = getWatchHistory(context.user.id, input.type, input.period);
  return { count, history };
});
