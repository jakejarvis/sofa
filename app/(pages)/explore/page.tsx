import { IconDeviceTv, IconFlame, IconMovie } from "@tabler/icons-react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { getUserStatusesByTmdbIds } from "@/lib/services/tracking";
import { getGenres, getPopular, getTrending } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { FilterableTitleRow } from "./filterable-title-row";
import { HeroBanner } from "./hero-banner";
import { TitleRow } from "./title-row";

function mapResults(
  results: {
    id: number;
    media_type?: string;
    title?: string;
    name?: string;
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
  }[],
  fallbackType: "movie" | "tv",
) {
  return results
    .filter((r) => r.poster_path)
    .map((r) => ({
      tmdbId: r.id,
      type: (r.media_type === "movie" || r.media_type === "tv"
        ? r.media_type
        : fallbackType) as "movie" | "tv",
      title: r.title ?? r.name ?? "",
      posterPath: tmdbImageUrl(r.poster_path, "w500"),
      releaseDate: r.release_date ?? r.first_air_date ?? null,
      voteAverage: r.vote_average,
    }));
}

export default async function ExplorePage() {
  const [trending, popularMovies, popularTv, movieGenres, tvGenres] =
    await Promise.all([
      getTrending("all", "day"),
      getPopular("movie"),
      getPopular("tv"),
      getGenres("movie"),
      getGenres("tv"),
    ]);

  const trendingItems = mapResults(trending.results, "movie");
  const popularMovieItems = mapResults(popularMovies.results, "movie");
  const popularTvItems = mapResults(popularTv.results, "tv");

  // Fetch user statuses for all visible TMDB IDs
  let userStatuses: Record<string, "watchlist" | "in_progress" | "completed"> =
    {};
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const allItems = [
      ...trendingItems,
      ...popularMovieItems,
      ...popularTvItems,
    ];
    userStatuses = getUserStatusesByTmdbIds(
      session.user.id,
      allItems.map((i) => ({ tmdbId: i.tmdbId, type: i.type })),
    );
  }

  const heroTitle = trending.results.find(
    (r) =>
      r.backdrop_path && (r.media_type === "movie" || r.media_type === "tv"),
  );

  return (
    <div className="space-y-10">
      {heroTitle && (
        <HeroBanner
          tmdbId={heroTitle.id}
          type={heroTitle.media_type as "movie" | "tv"}
          title={heroTitle.title ?? heroTitle.name ?? ""}
          overview={heroTitle.overview}
          backdropPath={tmdbImageUrl(heroTitle.backdrop_path, "w1280")}
          voteAverage={heroTitle.vote_average}
        />
      )}

      <TitleRow
        heading="Trending Today"
        icon={<IconFlame className="size-5 text-primary" />}
        items={trendingItems.slice(0, 20)}
        userStatuses={userStatuses}
      />

      <FilterableTitleRow
        heading="Popular Movies"
        icon={<IconMovie className="size-5 text-primary" />}
        mediaType="movie"
        defaultItems={popularMovieItems.slice(0, 20)}
        genres={movieGenres.genres}
        userStatuses={userStatuses}
      />

      <FilterableTitleRow
        heading="Popular TV Shows"
        icon={<IconDeviceTv className="size-5 text-primary" />}
        mediaType="tv"
        defaultItems={popularTvItems.slice(0, 20)}
        genres={tvGenres.genres}
        userStatuses={userStatuses}
      />
    </div>
  );
}
