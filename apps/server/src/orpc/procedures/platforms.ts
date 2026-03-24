import { listPlatforms } from "@sofa/core/platforms";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { os } from "../context";
import { authed } from "../middleware";

export const list = os.platforms.list.use(authed).handler(async () => {
  const allPlatforms = listPlatforms();
  return {
    platforms: allPlatforms.map((p) => ({
      id: p.id,
      name: p.name,
      tmdbProviderId: p.tmdbProviderId,
      logoPath: tmdbImageUrl(p.logoPath, "logos"),
      displayOrder: p.displayOrder,
    })),
  };
});
