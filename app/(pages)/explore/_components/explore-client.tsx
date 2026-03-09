"use client";

import { IconDeviceTv, IconFlame, IconMovie } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/tanstack";
import { FilterableTitleRow } from "./filterable-title-row";
import { HeroBanner } from "./hero-banner";
import { TitleRow } from "./title-row";

function ExploreSkeletons() {
  return (
    <div className="space-y-10">
      <Skeleton className="-mt-6 mr-[calc(-50vw+50%)] ml-[calc(-50vw+50%)] h-[320px] rounded-none" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 8 }).map((_, j) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                key={j}
                className="w-[140px] shrink-0 sm:w-[160px]"
              >
                <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExploreClient() {
  const { data: trending, isPending: trendingPending } = useQuery(
    orpc.explore.trending.queryOptions({ input: { type: "all" } }),
  );
  const { data: popularMovies, isPending: moviesPending } = useQuery(
    orpc.explore.popular.queryOptions({ input: { type: "movie" } }),
  );
  const { data: popularTv, isPending: tvPending } = useQuery(
    orpc.explore.popular.queryOptions({ input: { type: "tv" } }),
  );
  const { data: movieGenreData } = useQuery(
    orpc.explore.genres.queryOptions({ input: { type: "movie" } }),
  );
  const { data: tvGenreData } = useQuery(
    orpc.explore.genres.queryOptions({ input: { type: "tv" } }),
  );

  const isPending = trendingPending || moviesPending || tvPending;

  if (isPending) return <ExploreSkeletons />;

  // Merge user statuses and episode progress from all responses
  const userStatuses = {
    ...trending?.userStatuses,
    ...popularMovies?.userStatuses,
    ...popularTv?.userStatuses,
  };
  const episodeProgress = {
    ...trending?.episodeProgress,
    ...popularMovies?.episodeProgress,
    ...popularTv?.episodeProgress,
  };

  return (
    <div className="space-y-10">
      {trending?.hero && (
        <HeroBanner
          tmdbId={trending.hero.tmdbId}
          type={trending.hero.type}
          title={trending.hero.title}
          overview={trending.hero.overview}
          backdropPath={trending.hero.backdropPath}
          voteAverage={trending.hero.voteAverage}
        />
      )}

      <TitleRow
        heading="Trending Today"
        icon={<IconFlame aria-hidden={true} className="size-5 text-primary" />}
        items={(trending?.items ?? []).slice(0, 20)}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />

      <FilterableTitleRow
        heading="Popular Movies"
        icon={<IconMovie aria-hidden={true} className="size-5 text-primary" />}
        mediaType="movie"
        defaultItems={(popularMovies?.items ?? []).slice(0, 20)}
        genres={movieGenreData?.genres ?? []}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />

      <FilterableTitleRow
        heading="Popular TV Shows"
        icon={
          <IconDeviceTv aria-hidden={true} className="size-5 text-primary" />
        }
        mediaType="tv"
        defaultItems={(popularTv?.items ?? []).slice(0, 20)}
        genres={tvGenreData?.genres ?? []}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />
    </div>
  );
}
