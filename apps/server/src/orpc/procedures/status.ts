import { isTmdbConfigured } from "@sofa/auth/config";
import { getSystemHealth } from "@sofa/core/system-health";
import { os } from "../context";
import { authed } from "../middleware";

export const systemStatus = os.systemStatus
  .use(authed)
  .handler(async ({ context }) => {
    const tmdbConfigured = isTmdbConfigured();

    if (context.user.role === "admin") {
      const health = await getSystemHealth();
      return { tmdbConfigured, health };
    }

    return { tmdbConfigured };
  });
