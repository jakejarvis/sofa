import { useLingui } from "@lingui/react/macro";
import { FlashList } from "@shopify/flash-list";
import {
  IconBooks,
  IconCheck,
  IconDeviceTvOld,
  IconMovie,
  IconPlayerPlay,
  IconThumbUp,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { ContinueWatchingCard } from "@/components/dashboard/continue-watching-card";
import { HorizontalPosterRow } from "@/components/dashboard/horizontal-poster-row";
import { StatsCard } from "@/components/dashboard/stats-card";
import { UpcomingSection } from "@/components/dashboard/upcoming-section";
import { EmptyState } from "@/components/ui/empty-state";
import {
  HorizontalListSeparator,
  horizontalListContentStyle,
  horizontalListStyle,
} from "@/components/ui/horizontal-list-spacing";
import { SectionHeader } from "@/components/ui/section-header";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { authClient } from "@/lib/server";
import type { TimePeriod } from "@sofa/api/schemas";

const dashboardContentContainerStyle = {
  paddingTop: 8,
  paddingBottom: 16,
};

export default function DashboardScreen() {
  const { t } = useLingui();
  const { push } = useRouter();
  authClient.useSession();

  const [moviePeriod, setMoviePeriod] = useState<TimePeriod>("this_month");
  const [episodePeriod, setEpisodePeriod] = useState<TimePeriod>("this_week");

  const [primaryColor, watchingColor, watchlistColor, completedColor] = useCSSVariable([
    "--color-primary",
    "--color-status-watching",
    "--color-status-watchlist",
    "--color-status-completed",
  ]) as [string, string, string, string];

  const stats = useQuery(orpc.dashboard.stats.queryOptions());
  const movieHistory = useQuery(
    orpc.dashboard.watchHistory.queryOptions({
      input: { type: "movie", period: moviePeriod },
    }),
  );
  const episodeHistory = useQuery(
    orpc.dashboard.watchHistory.queryOptions({
      input: { type: "episode", period: episodePeriod },
    }),
  );
  const continueWatching = useQuery(orpc.dashboard.continueWatching.queryOptions());
  const library = useQuery(orpc.library.list.queryOptions({ input: { page: 1, limit: 10 } }));
  const recommendations = useQuery(orpc.dashboard.recommendations.queryOptions());

  const isRefreshing =
    stats.isRefetching ||
    continueWatching.isRefetching ||
    library.isRefetching ||
    movieHistory.isRefetching ||
    episodeHistory.isRefetching;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
    queryClient.invalidateQueries({ queryKey: orpc.library.key() });
  }, []);

  const hasLibrary = (library.data?.items?.length ?? 0) > 0;
  const hasContinueWatching = (continueWatching.data?.items?.length ?? 0) > 0;
  const hasRecommendations = (recommendations.data?.items?.length ?? 0) > 0;

  const movieCount = movieHistory.data?.count ?? stats.data?.moviesThisMonth;
  const episodeCount = episodeHistory.data?.count ?? stats.data?.episodesThisWeek;

  const periodLabels: Record<TimePeriod, string> = {
    today: t`today`,
    this_week: t`this week`,
    this_month: t`this month`,
    this_year: t`this year`,
  };

  const renderContinueWatchingItem = useCallback(
    ({ item }: { item: NonNullable<typeof continueWatching.data>["items"][number] }) => (
      <ContinueWatchingCard item={item} />
    ),
    [],
  );

  return (
    <ScrollView
      className="bg-background"
      contentContainerStyle={dashboardContentContainerStyle}
      contentInsetAdjustmentBehavior="automatic"
      scrollToOverflowEnabled
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View className="gap-6">
        {/* Stats Grid */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)} className="px-4">
          <View className="gap-3">
            <View className="flex-row gap-3">
              <StatsCard
                label={(() => {
                  const period = periodLabels[moviePeriod];
                  return t`Movies ${period}`;
                })()}
                value={movieCount}
                icon={IconMovie}
                color="text-primary"
                tintColor={primaryColor}
                bgColor="bg-primary/10"
                sparklineData={movieHistory.data?.history}
                period={moviePeriod}
                onPeriodChange={setMoviePeriod}
              />
              <StatsCard
                label={(() => {
                  const period = periodLabels[episodePeriod];
                  return t`Episodes ${period}`;
                })()}
                value={episodeCount}
                icon={IconDeviceTvOld}
                color="text-status-watching"
                tintColor={watchingColor}
                bgColor="bg-status-watching/10"
                sparklineData={episodeHistory.data?.history}
                period={episodePeriod}
                onPeriodChange={setEpisodePeriod}
              />
            </View>
            <View className="flex-row gap-3">
              <StatsCard
                label={t`In Library`}
                value={stats.data?.librarySize}
                icon={IconBooks}
                color="text-status-watchlist"
                tintColor={watchlistColor}
                bgColor="bg-status-watchlist/10"
              />
              <StatsCard
                label={t`Completed`}
                value={stats.data?.completed}
                icon={IconCheck}
                color="text-status-completed"
                tintColor={completedColor}
                bgColor="bg-status-completed/10"
              />
            </View>
          </View>
        </Animated.View>

        {/* Continue Watching */}
        {hasContinueWatching && (
          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <View className="px-4">
              <SectionHeader title={t`Continue Watching`} icon={IconPlayerPlay} />
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

        {/* Upcoming */}
        <Animated.View entering={FadeInDown.duration(300).delay(250)}>
          <UpcomingSection />
        </Animated.View>

        {/* Library */}
        <Animated.View entering={FadeInDown.duration(300).delay(350)}>
          <View className="px-4">
            <SectionHeader
              title={t`In Your Library`}
              icon={IconBooks}
              onSeeAll={() => push("/(tabs)/(library)")}
            />
          </View>
          {library.isPending ? (
            <HorizontalPosterRow items={[]} isLoading />
          ) : hasLibrary ? (
            <HorizontalPosterRow items={library.data?.items ?? []} />
          ) : (
            <EmptyState
              title={t`Your library is empty`}
              description={t`Start tracking movies and shows`}
              actionLabel={t`Explore`}
              onAction={() => push("/(tabs)/(explore)")}
            />
          )}
        </Animated.View>

        {/* Recommendations */}
        {hasRecommendations && (
          <Animated.View entering={FadeInDown.duration(300).delay(450)}>
            <View className="px-4">
              <SectionHeader title={t`Recommended for You`} icon={IconThumbUp} />
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
