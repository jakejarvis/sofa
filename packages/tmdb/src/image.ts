export type ImageCategory = "posters" | "backdrops" | "stills" | "logos" | "profiles";

const IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

export const IMAGE_CATEGORY_SIZES: Record<ImageCategory, string> = {
  posters: "w500",
  backdrops: "w1280",
  stills: "w1280",
  logos: "w92",
  profiles: "w185",
};

export function tmdbCdnImageUrl(
  path: string | null,
  category: ImageCategory,
  sizeOverride?: string,
) {
  if (!path) return null;
  const size = sizeOverride ?? IMAGE_CATEGORY_SIZES[category];
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export function tmdbImageUrl(path: string | null, category: ImageCategory, sizeOverride?: string) {
  if (!path) return null;

  if (process.env.IMAGE_CACHE_ENABLED === "false") {
    return tmdbCdnImageUrl(path, category, sizeOverride);
  }

  const filename = path.startsWith("/") ? path.slice(1) : path;
  return `/images/${category}/${filename}`;
}
