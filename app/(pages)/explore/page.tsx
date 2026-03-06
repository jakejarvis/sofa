import { IconDeviceTv, IconFlame, IconMovie } from "@tabler/icons-react";
import { getSession } from "@/lib/auth/session";
import {
  getEpisodeProgressByTmdbIds,
  getUserStatusesByTmdbIds,
} from "@/lib/services/tracking";
import { getGenres, getPopular, getTrending } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { FilterableTitleRow } from "./_components/filterable-title-row";
import { HeroBanner } from "./_components/hero-banner";
import { TitleRow } from "./_components/title-row";

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
  // Fetch session in parallel with TMDB calls
  const [trending, popularMovies, popularTv, movieGenres, tvGenres, session] =
    await Promise.all([
      getTrending("all", "day"),
      getPopular("movie"),
      getPopular("tv"),
      getGenres("movie"),
      getGenres("tv"),
      getSession(),
    ]);

  const trendingItems = mapResults(trending.results, "movie");
  const popularMovieItems = mapResults(popularMovies.results, "movie");
  const popularTvItems = mapResults(popularTv.results, "tv");

  // Fetch user statuses and episode progress for all visible TMDB IDs
  let userStatuses: Record<string, "watchlist" | "in_progress" | "completed"> =
    {};
  let episodeProgress: Record<string, { watched: number; total: number }> = {};
  if (session) {
    const allItems = [
      ...trendingItems,
      ...popularMovieItems,
      ...popularTvItems,
    ];
    const tmdbLookups = allItems.map((i) => ({
      tmdbId: i.tmdbId,
      type: i.type,
    }));
    userStatuses = getUserStatusesByTmdbIds(session.user.id, tmdbLookups);
    episodeProgress = getEpisodeProgressByTmdbIds(session.user.id, tmdbLookups);
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
        icon={<IconFlame aria-hidden={true} className="size-5 text-primary" />}
        items={trendingItems.slice(0, 20)}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />

      <FilterableTitleRow
        heading="Popular Movies"
        icon={<IconMovie aria-hidden={true} className="size-5 text-primary" />}
        mediaType="movie"
        defaultItems={popularMovieItems.slice(0, 20)}
        genres={movieGenres.genres}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />

      <FilterableTitleRow
        heading="Popular TV Shows"
        icon={
          <IconDeviceTv aria-hidden={true} className="size-5 text-primary" />
        }
        mediaType="tv"
        defaultItems={popularTvItems.slice(0, 20)}
        genres={tvGenres.genres}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />
    </div>
  );
}
