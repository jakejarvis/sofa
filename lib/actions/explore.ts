"use server";

import { requireSession } from "@/lib/auth/session";
import { discover } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function discoverByGenre(
  mediaType: "movie" | "tv",
  genreId: number,
) {
  await requireSession();
  const results = await discover(mediaType, {
    sort_by: "popularity.desc",
    "vote_count.gte": "50",
    with_genres: String(genreId),
  });
  return results.results
    .filter((r) => r.poster_path)
    .map((r) => ({
      tmdbId: r.id,
      type: mediaType,
      title: (r.title ?? r.name) as string,
      posterPath: tmdbImageUrl(r.poster_path, "posters"),
      releaseDate: (r.release_date ?? r.first_air_date ?? null) as
        | string
        | null,
      voteAverage: r.vote_average,
    }));
}
