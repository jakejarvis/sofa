import { FlashList } from "@shopify/flash-list";
import {
  IconBooks,
  IconPlayerPlay,
  IconThumbUp,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ContinueWatchingCard } from "@/components/dashboard/continue-watching-card";
import { HorizontalPosterRow } from "@/components/dashboard/horizontal-poster-row";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  HorizontalListSeparator,
  horizontalListContentStyle,
  horizontalListStyle,
} from "@/components/ui/horizontal-list-spacing";
import { SectionHeader } from "@/components/ui/section-header";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

const dashboardContentContainerStyle = {
  paddingTop: 8,
  paddingBottom: 16,
};

export default function DashboardScreen() {
  const { push } = useRouter();
  authClient.useSession();

  const stats = useQuery(orpc.dashboard.stats.queryOptions());
  const continueWatching = useQuery(
    orpc.dashboard.continueWatching.queryOptions(),
  );
  const library = useQuery(orpc.dashboard.library.queryOptions({ input: {} }));
  const recommendations = useQuery(
    orpc.dashboard.recommendations.queryOptions(),
  );

  const isRefreshing =
    stats.isRefetching || continueWatching.isRefetching || library.isRefetching;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
  }, []);

  const hasLibrary = (library.data?.items?.length ?? 0) > 0;
  const hasContinueWatching = (continueWatching.data?.items?.length ?? 0) > 0;
  const hasRecommendations = (recommendations.data?.items?.length ?? 0) > 0;

  const statsData = useMemo(
    () => [
      { label: "Movies this month", value: stats.data?.moviesThisMonth },
      { label: "Episodes this week", value: stats.data?.episodesThisWeek },
      { label: "In library", value: stats.data?.librarySize },
      { label: "Completed", value: stats.data?.completed },
    ],
    [stats.data],
  );

  const renderStatItem = useCallback(
    ({ item }: { item: (typeof statsData)[number] }) => (
      <StatsCard label={item.label} value={item.value} />
    ),
    [],
  );
  const renderContinueWatchingItem = useCallback(
    ({
      item,
    }: {
      item: NonNullable<typeof continueWatching.data>["items"][number];
    }) => <ContinueWatchingCard item={item} />,
    [],
  );

  return (
    <ScrollView
      className="bg-background"
      contentContainerStyle={dashboardContentContainerStyle}
      contentInsetAdjustmentBehavior="automatic"
      scrollToOverflowEnabled
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View className="gap-8">
        {/* Stats */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <FlashList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={statsData}
            keyExtractor={(item) => item.label}
            renderItem={renderStatItem}
            ItemSeparatorComponent={HorizontalListSeparator}
            contentContainerStyle={horizontalListContentStyle}
            style={horizontalListStyle}
          />
        </Animated.View>

        {/* Continue Watching */}
        {hasContinueWatching && (
          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <View className="px-4">
              <SectionHeader title="Continue Watching" icon={IconPlayerPlay} />
            </View>
            <FlashList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={continueWatching.data?.items ?? []}
              keyExtractor={(item) => item.title.id}
              renderItem={renderContinueWatchingItem}
              ItemSeparatorComponent={HorizontalListSeparator}
              contentContainerStyle={horizontalListContentStyle}
              style={horizontalListStyle}
            />
          </Animated.View>
        )}

        {/* Library */}
        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <View className="px-4">
            <SectionHeader title="In Your Library" icon={IconBooks} />
          </View>
          {library.isPending ? (
            <HorizontalPosterRow items={[]} isLoading />
          ) : hasLibrary ? (
            <HorizontalPosterRow items={library.data?.items ?? []} />
          ) : (
            <EmptyState
              title="Your library is empty"
              description="Start tracking movies and shows"
              actionLabel="Explore"
              onAction={() => push("/(tabs)/(explore)")}
            />
          )}
        </Animated.View>

        {/* Recommendations */}
        {hasRecommendations && (
          <Animated.View entering={FadeInDown.duration(300).delay(400)}>
            <View className="px-4">
              <SectionHeader title="Recommended for You" icon={IconThumbUp} />
            </View>
            <HorizontalPosterRow
              items={recommendations.data?.items ?? []}
              isLoading={recommendations.isPending}
            />
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}
