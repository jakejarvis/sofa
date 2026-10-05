import { Trans, useLingui } from "@lingui/react/macro";
import { IconAlertTriangle, IconCalendarEvent } from "@tabler/icons-react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, SectionList, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCSSVariable, useResolveClassNames } from "uniwind";

import { UpcomingRow } from "@/components/dashboard/upcoming-row";
import { EmptyState } from "@/components/ui/empty-state";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import * as Haptics from "@/utils/haptics";
import { groupByDateBucket } from "@sofa/i18n/date-buckets";

const contentContainerStyle = { paddingBottom: 24 };

function FilterChip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={`rounded-full px-3 py-1.5 ${isSelected ? "bg-primary" : "bg-secondary"}`}
    >
      <Text
        className={`font-sans text-xs font-medium ${isSelected ? "text-primary-foreground" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function UpcomingScreen() {
  const { t } = useLingui();
  const headerTitleStyle = useResolveClassNames("font-display text-foreground text-xl");
  const tintColor = useCSSVariable("--color-primary") as string;
  const backgroundColor = useCSSVariable("--color-background") as string;
  const mutedColor = useCSSVariable("--color-muted-foreground") as string;

  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "watching" | "watchlist">("all");

  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      orpc.library.upcoming.infiniteOptions({
        input: (pageParam: string | undefined) => ({
          days: 90,
          limit: 20,
          cursor: pageParam,
          mediaType: mediaType !== "all" ? mediaType : undefined,
          statusFilter: statusFilter !== "all" ? [statusFilter] : undefined,
        }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }),
    );

  const allItems = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const sections = useMemo(
    () =>
      groupByDateBucket(allItems).map((b) => ({
        key: b.key,
        title: b.label,
        data: b.items,
      })),
    [allItems],
  );

  const refreshUpcoming = useCallback(
    () => queryClient.invalidateQueries({ queryKey: orpc.library.upcoming.key() }),
    [],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refreshUpcoming);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filterChips = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingTop: 10, paddingBottom: 6 }}
    >
      <FilterChip
        label={t`All`}
        isSelected={mediaType === "all"}
        onPress={() => setMediaType("all")}
      />
      <FilterChip
        label={t`Movies`}
        isSelected={mediaType === "movie"}
        onPress={() => setMediaType("movie")}
      />
      <FilterChip
        label={t`TV`}
        isSelected={mediaType === "tv"}
        onPress={() => setMediaType("tv")}
      />
      <View className="bg-border/30 mx-1 w-px self-stretch" />
      <FilterChip
        label={t`Watching`}
        isSelected={statusFilter === "watching"}
        onPress={() => setStatusFilter(statusFilter === "watching" ? "all" : "watching")}
      />
      <FilterChip
        label={t`Watchlist`}
        isSelected={statusFilter === "watchlist"}
        onPress={() => setStatusFilter(statusFilter === "watchlist" ? "all" : "watchlist")}
      />
    </ScrollView>
  );

  return (
    <>
      <Stack.Header
        transparent
        blurEffect="systemChromeMaterialDark"
        style={{
          color: tintColor,
          shadowColor: "transparent",
          backgroundColor: process.env.EXPO_OS === "ios" ? undefined : backgroundColor,
        }}
      />
      <Stack.Screen.Title style={headerTitleStyle as Record<string, unknown>}>
        {t`Upcoming`}
      </Stack.Screen.Title>
      <Stack.Screen.BackButton displayMode="minimal" />
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.titleId}-${item.date}-${i}`}
        ListHeaderComponent={filterChips}
        renderItem={({ item }) => (
          <View className="px-4 py-1">
            <UpcomingRow item={item} />
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View className="bg-background px-4 pt-3 pb-1">
            <Text className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {title}
            </Text>
          </View>
        )}
        stickySectionHeadersEnabled
        contentContainerStyle={contentContainerStyle}
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          isPending ? null : isError && allItems.length === 0 ? (
            <EmptyState
              icon={IconAlertTriangle}
              title={t`Something went wrong`}
              description={t`Couldn't load upcoming releases`}
              actionLabel={t`Retry`}
              onAction={() => refetch()}
            />
          ) : (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="items-center justify-center px-4 py-16"
            >
              <ScaledIcon icon={IconCalendarEvent} size={48} color={`${mutedColor}66`} />
              <Text className="text-muted-foreground mt-4 text-center text-sm">
                <Trans>No upcoming episodes or releases in the next 90 days.</Trans>
              </Text>
            </Animated.View>
          )
        }
      />
    </>
  );
}
