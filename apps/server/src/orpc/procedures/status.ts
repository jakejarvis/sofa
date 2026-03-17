import { getSystemHealth } from "@sofa/core/system-health";
import { isTmdbConfigured } from "@sofa/tmdb/config";
import { os } from "../context";
import { admin, authed } from "../middleware";

export const status = os.system.status.use(authed).handler(() => {
  return {
    tmdbConfigured: isTmdbConfigured(),
    publicApiUrl: process.env.PUBLIC_API_URL || "https://public-api.sofa.watch",
  };
});

export const health = os.system.health.use(admin).handler(async () => {
  return await getSystemHealth();
});
