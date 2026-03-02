import type { ImageCategory } from "@/lib/services/image-cache";

const IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

function sizeToCategory(size: string): ImageCategory {
  if (size === "w92") return "logos";
  if (size === "w1280") return "backdrops";
  return "posters";
}

export function tmdbImageUrl(
  path: string | null,
  size = "w500",
  category?: ImageCategory,
) {
  if (!path) return null;

  if (process.env.IMAGE_CACHE_ENABLED === "false") {
    return `${IMAGE_BASE_URL}/${size}${path}`;
  }

  const resolved = category ?? sizeToCategory(size);
  const filename = path.startsWith("/") ? path.slice(1) : path;
  return `/api/images/${resolved}/${filename}`;
}
