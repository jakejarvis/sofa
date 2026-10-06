import { useLingui } from "@lingui/react/macro";
import { IconDeviceTv, IconFlame, IconMovie } from "@tabler/icons-react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { FilterableTitleRow } from "@/components/explore/filterable-title-row";
import { HeroBanner } from "@/components/explore/hero-banner";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

const exploreContentContainerStyle = {
  paddingTop: 8,
  paddingBottom: 16,
};

export default function ExploreScreen() {
  const { t } = useLingui();
  const trending = useInfiniteQuery(
    orpc.discover.trending.infiniteOptions({
      input: (pageParam: number) => ({ type: "all" as const, page: pageParam }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    }),
  );
  const popularMovies = useQuery(orpc.discover.popular.queryOptions({ input: { type: "movie" } }));
  const popularTv = useQuery(orpc.discover.popular.queryOptions({ input: { type: "tv" } }));
  const movieGenres = useQuery(orpc.discover.genres.queryOptions({ input: { type: "movie" } }));
  const tvGenres = useQuery(orpc.discover.genres.queryOptions({ input: { type: "tv" } }));

  const refreshDiscover = useCallback(
    () => queryClient.invalidateQueries({ queryKey: orpc.discover.key() }),
    [],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refreshDiscover);

  const heroItem = trending.data?.pages[0]?.hero ?? null;

  const trendingItems = useMemo(
    () => trending.data?.pages.flatMap((p) => p.items) ?? [],
    [trending.data?.pages],
  );
  const trendingStatuses = useMemo(
    () =>
      Object.assign({}, ...(trending.data?.pages.map((p) => p.userStatuses) ?? [])) as Record<
        string,
        "in_watchlist" | "watching" | "caught_up" | "completed"
      >,
    [trending.data?.pages],
  );
  const trendingProgress = useMemo(
    () =>
      Object.assign({}, ...(trending.data?.pages.map((p) => p.episodeProgress) ?? [])) as Record<
        string,
        { watched: number; total: number }
      >,
    [trending.data?.pages],
  );

  return (
    <ScrollView
      className="bg-background"
      contentContainerStyle={exploreContentContainerStyle}
      contentInsetAdjustmentBehavior="automatic"
      scrollToOverflowEnabled
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="gap-8">
        {heroItem && <HeroBanner item={heroItem} />}

        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <FilterableTitleRow
            title={t`Trending Today`}
            icon={IconFlame}
            mediaType="movie"
            defaultItems={trendingItems}
            defaultUserStatuses={trendingStatuses}
            defaultEpisodeProgress={trendingProgress}
            isLoading={trending.isPending}
            isError={trending.isError}
            onRetry={() => void trending.refetch()}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <FilterableTitleRow
            title={t`Popular Movies`}
            icon={IconMovie}
            mediaType="movie"
            defaultItems={popularMovies.data?.items ?? []}
            defaultUserStatuses={popularMovies.data?.userStatuses ?? {}}
            defaultEpisodeProgress={popularMovies.data?.episodeProgress ?? {}}
            genres={movieGenres.data?.genres}
            isLoading={popularMovies.isPending}
            isError={popularMovies.isError}
            onRetry={() => void popularMovies.refetch()}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <FilterableTitleRow
            title={t`Popular TV Shows`}
            icon={IconDeviceTv}
            mediaType="tv"
            defaultItems={popularTv.data?.items ?? []}
            defaultUserStatuses={popularTv.data?.userStatuses ?? {}}
            defaultEpisodeProgress={popularTv.data?.episodeProgress ?? {}}
            genres={tvGenres.data?.genres}
            isLoading={popularTv.isPending}
            isError={popularTv.isError}
            onRetry={() => void popularTv.refetch()}
          />
        </Animated.View>
      </View>
    </ScrollView>
  );
}
