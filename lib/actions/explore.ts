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
  // Discover may return movie (title, release_date) or TV (name, first_air_date)
  // fields depending on mediaType. The schema types them separately, so widen.
  type DiscoverResult = NonNullable<typeof results.results>[number] & {
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
  };
  return ((results.results ?? []) as DiscoverResult[])
    .filter((r) => r.poster_path)
    .map((r) => ({
      tmdbId: r.id,
      type: mediaType,
      title: r.title ?? r.name ?? "",
      posterPath: tmdbImageUrl(r.poster_path ?? null, "posters"),
      releaseDate: r.release_date ?? r.first_air_date ?? null,
      voteAverage: r.vote_average,
    }));
}
