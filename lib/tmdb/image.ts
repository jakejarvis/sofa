const IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

export function tmdbImageUrl(path: string | null, size = "w500") {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}
