import { listPlatforms, getPlatformTmdbIdMap } from "@sofa/core/platforms";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { os } from "../context";
import { authed } from "../middleware";

export const list = os.platforms.list.use(authed).handler(async () => {
  const allPlatforms = listPlatforms();
  const tmdbIdsMap = getPlatformTmdbIdMap(allPlatforms.map((p) => p.id));
  return {
    platforms: allPlatforms.map((p) => ({
      id: p.id,
      name: p.name,
      tmdbProviderIds: tmdbIdsMap.get(p.id) ?? [],
      logoPath: tmdbImageUrl(p.logoPath, "logos"),
      isSubscription: p.isSubscription,
    })),
  };
});
