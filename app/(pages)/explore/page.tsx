import { IconDeviceTv, IconFlame, IconMovie } from "@tabler/icons-react";
import { getGenres, getPopular, getTrending } from "@/lib/tmdb/client";
import { GenreBrowser } from "./genre-browser";
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
      posterPath: r.poster_path,
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
          backdropPath={heroTitle.backdrop_path}
          voteAverage={heroTitle.vote_average}
        />
      )}

      <TitleRow
        heading="Trending Today"
        icon={<IconFlame size={20} className="text-primary" />}
        items={trendingItems.slice(0, 20)}
      />

      <TitleRow
        heading="Popular Movies"
        icon={<IconMovie size={20} className="text-primary" />}
        items={popularMovieItems.slice(0, 20)}
      />

      <TitleRow
        heading="Popular TV Shows"
        icon={<IconDeviceTv size={20} className="text-primary" />}
        items={popularTvItems.slice(0, 20)}
      />

      <GenreBrowser
        movieGenres={movieGenres.genres}
        tvGenres={tvGenres.genres}
      />
    </div>
  );
}
