import type { ImageCategory } from "@/lib/services/image-cache";

const IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

const CATEGORY_SIZES: Record<ImageCategory, string> = {
  posters: "w500",
  backdrops: "w1280",
  stills: "w1280",
  logos: "w92",
  profiles: "w185",
};

export function tmdbImageUrl(
  path: string | null,
  category: ImageCategory,
  sizeOverride?: string,
) {
  if (!path) return null;

  const size = sizeOverride ?? CATEGORY_SIZES[category];

  if (process.env.IMAGE_CACHE_ENABLED === "false") {
    return `${IMAGE_BASE_URL}/${size}${path}`;
  }

  const filename = path.startsWith("/") ? path.slice(1) : path;
  return `/api/images/${category}/${filename}`;
}
