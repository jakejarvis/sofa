import { useLingui } from "@lingui/react/macro";
import { IconDeviceTv, IconFlame, IconMovie } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";
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

function mergeMaps<T>(
  ...maps: (Record<string, T> | undefined)[]
): Record<string, T> {
  return Object.assign({}, ...maps.filter(Boolean));
}

export function ExploreClient() {
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
    <div className="space-y-10">
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
          icon={
            <IconFlame aria-hidden={true} className="size-5 text-primary" />
          }
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
        icon={<IconMovie aria-hidden={true} className="size-5 text-primary" />}
        mediaType="movie"
        defaultItems={(popularMoviesData?.items ?? []).slice(0, 20)}
        genres={movieGenreData?.genres ?? []}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />

      <FilterableTitleRow
        heading={t`Popular TV Shows`}
        icon={
          <IconDeviceTv aria-hidden={true} className="size-5 text-primary" />
        }
        mediaType="tv"
        defaultItems={(popularTvData?.items ?? []).slice(0, 20)}
        genres={tvGenreData?.genres ?? []}
        userStatuses={userStatuses}
        episodeProgress={episodeProgress}
      />
    </div>
  );
}
