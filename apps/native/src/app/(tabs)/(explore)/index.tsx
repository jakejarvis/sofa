import { IconDeviceTv, IconFlame, IconMovie } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useCallback } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { FilterableTitleRow } from "@/components/explore/filterable-title-row";
import { HeroBanner } from "@/components/explore/hero-banner";
import { orpc, queryClient } from "@/utils/orpc";

export default function ExploreScreen() {
  const trending = useQuery(
    orpc.explore.trending.queryOptions({ input: { type: "all" } }),
  );
  const popularMovies = useQuery(
    orpc.explore.popular.queryOptions({ input: { type: "movie" } }),
  );
  const popularTv = useQuery(
    orpc.explore.popular.queryOptions({ input: { type: "tv" } }),
  );
  const movieGenres = useQuery(
    orpc.explore.genres.queryOptions({ input: { type: "movie" } }),
  );
  const tvGenres = useQuery(
    orpc.explore.genres.queryOptions({ input: { type: "tv" } }),
  );

  const isRefreshing =
    trending.isRefetching ||
    popularMovies.isRefetching ||
    popularTv.isRefetching;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orpc.explore.key() });
    queryClient.invalidateQueries({ queryKey: orpc.discover.key() });
  }, []);

  const heroItem = trending.data?.hero;

  return (
    <ScrollView
      className="bg-background"
      contentContainerStyle={{
        paddingBottom: 16,
      }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColorClassName="accent-primary"
        />
      }
    >
      <Stack.Screen options={{ title: "Explore" }} />
      <View className="gap-8">
        {heroItem && (
          <Animated.View entering={FadeIn.duration(400)}>
            <HeroBanner item={heroItem} />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <FilterableTitleRow
            title="Trending Today"
            icon={IconFlame}
            mediaType="movie"
            defaultItems={trending.data?.items ?? []}
            defaultUserStatuses={trending.data?.userStatuses ?? {}}
            defaultEpisodeProgress={trending.data?.episodeProgress ?? {}}
            isLoading={trending.isPending}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <FilterableTitleRow
            title="Popular Movies"
            icon={IconMovie}
            mediaType="movie"
            defaultItems={popularMovies.data?.items ?? []}
            defaultUserStatuses={popularMovies.data?.userStatuses ?? {}}
            defaultEpisodeProgress={popularMovies.data?.episodeProgress ?? {}}
            genres={movieGenres.data?.genres}
            isLoading={popularMovies.isPending}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <FilterableTitleRow
            title="Popular TV Shows"
            icon={IconDeviceTv}
            mediaType="tv"
            defaultItems={popularTv.data?.items ?? []}
            defaultUserStatuses={popularTv.data?.userStatuses ?? {}}
            defaultEpisodeProgress={popularTv.data?.episodeProgress ?? {}}
            genres={tvGenres.data?.genres}
            isLoading={popularTv.isPending}
          />
        </Animated.View>
      </View>
    </ScrollView>
  );
}
