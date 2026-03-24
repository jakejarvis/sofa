import { useLingui } from "@lingui/react/macro";
import { IconDeviceTv, IconFlame, IconMovie } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { DiscoverSection } from "@/components/explore/discover-section";
import { FilterableTitleRow } from "@/components/explore/filterable-title-row";
import { HeroBanner } from "@/components/explore/hero-banner";
import { TitleRow } from "@/components/explore/title-row";
import { RouteError } from "@/components/route-error";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

export const Route = createFileRoute("/_app/explore")({
  staleTime: 60_000,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        orpc.explore.trending.infiniteOptions({
          input: (pageParam: number) => ({ type: "all" as const, page: pageParam }),
          initialPageParam: 1,
          getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
          maxPages: 10,
        }),
      ),
      context.queryClient.ensureQueryData(
        orpc.explore.popular.queryOptions({ input: { type: "movie" } }),
      ),
      context.queryClient.ensureQueryData(
        orpc.explore.popular.queryOptions({ input: { type: "tv" } }),
      ),
      context.queryClient.ensureQueryData(
        orpc.explore.genres.queryOptions({ input: { type: "movie" } }),
      ),
      context.queryClient.ensureQueryData(
        orpc.explore.genres.queryOptions({ input: { type: "tv" } }),
      ),
    ]);
  },
  head: () => ({ meta: [{ title: "Explore — Sofa" }] }),
  pendingComponent: ExploreSkeletons,
  errorComponent: RouteError,
  component: ExplorePage,
});

function ExploreSkeletons() {
  return (
    <div className="space-y-6">
      <Skeleton className="-mt-6 mr-[calc(-50vw+50%)] ml-[calc(-50vw+50%)] h-[320px] rounded-none" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="w-[140px] shrink-0 sm:w-[160px]">
                <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function mergeMaps<T>(...maps: (Record<string, T> | undefined)[]): Record<string, T> {
  return Object.assign({}, ...maps.filter(Boolean));
}

function ExplorePage() {
  const { t } = useLingui();
  const {
    data: trendingData,
    isPending: trendingPending,
    fetchNextPage: fetchNextTrending,
    hasNextPage: hasNextTrending,
    isFetchingNextPage: isFetchingNextTrending,
  } = useInfiniteQuery(
    orpc.explore.trending.infiniteOptions({
      input: (pageParam: number) => ({ type: "all" as const, page: pageParam }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      maxPages: 10,
    }),
  );

  const { data: popularMoviesData, isPending: moviesPending } = useQuery(
    orpc.explore.popular.queryOptions({ input: { type: "movie" } }),
  );
  const { data: popularTvData, isPending: tvPending } = useQuery(
    orpc.explore.popular.queryOptions({ input: { type: "tv" } }),
  );
  const { data: movieGenreData } = useQuery(
    orpc.explore.genres.queryOptions({ input: { type: "movie" } }),
  );
  const { data: tvGenreData } = useQuery(
    orpc.explore.genres.queryOptions({ input: { type: "tv" } }),
  );

  const isPending = trendingPending || moviesPending || tvPending;

  const trendingItems = useMemo(
    () => trendingData?.pages.flatMap((p) => p.items) ?? [],
    [trendingData?.pages],
  );

  const hero = trendingData?.pages[0]?.hero ?? null;

  if (isPending) return <ExploreSkeletons />;

  // Merge user statuses and episode progress from all responses
  const userStatuses = mergeMaps(
    ...(trendingData?.pages.map((p) => p.userStatuses) ?? []),
    popularMoviesData?.userStatuses,
    popularTvData?.userStatuses,
  );
  const episodeProgress = mergeMaps(
    ...(trendingData?.pages.map((p) => p.episodeProgress) ?? []),
    popularMoviesData?.episodeProgress,
    popularTvData?.episodeProgress,
  );

  return (
    <div className="space-y-6">
      {hero && (
        <HeroBanner
          id={hero.id}
          type={hero.type}
          title={hero.title}
          overview={hero.overview}
          backdropPath={hero.backdropPath}
          voteAverage={hero.voteAverage}
        />
      )}

      <div>
        <TitleRow
          heading={t`Trending Today`}
          icon={<IconFlame aria-hidden={true} className="text-primary size-5" />}
          items={trendingItems}
          userStatuses={userStatuses}
          episodeProgress={episodeProgress}
          onEndReached={fetchNextTrending}
          hasNextPage={hasNextTrending}
          isFetchingNextPage={isFetchingNextTrending}
        />
      </div>

      <FilterableTitleRow
        heading={t`Popular Movies`}
        icon={<IconMovie aria-hidden={true} className="text-primary size-5" />}
        mediaType="movie"
        defaultItems={(popularMoviesData?.items ?? []).slice(0, 20)}
        genres={movieGenreData?.genres ?? []}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />

      <FilterableTitleRow
        heading={t`Popular TV Shows`}
        icon={<IconDeviceTv aria-hidden={true} className="text-primary size-5" />}
        mediaType="tv"
        defaultItems={(popularTvData?.items ?? []).slice(0, 20)}
        genres={tvGenreData?.genres ?? []}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />

      <DiscoverSection />
    </div>
  );
}
