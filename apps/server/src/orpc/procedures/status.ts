import { os } from "../context";
import { authed } from "../middleware";

export const status = os.system.status.use(authed).handler(() => {
  return {
    publicApiUrl: process.env.PUBLIC_API_URL || "https://public-api.sofa.watch",
  };
});
