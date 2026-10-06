import { useLingui } from "@lingui/react/macro";
import { IconAlertTriangle, IconHistory } from "@tabler/icons-react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, SectionList, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCSSVariable, useResolveClassNames } from "uniwind";

import { HistoryRow } from "@/components/history/history-row";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadMoreFooter } from "@/components/ui/load-more-footer";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import * as Haptics from "@/utils/haptics";
import { formatLocalDate } from "@sofa/i18n/date-buckets";
import { formatDate } from "@sofa/i18n/format";

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

export default function HistoryScreen() {
  const { t } = useLingui();
  const headerTitleStyle = useResolveClassNames("font-display text-foreground text-xl");
  const tintColor = useCSSVariable("--color-primary") as string;
  const backgroundColor = useCSSVariable("--color-background") as string;
  const mutedColor = useCSSVariable("--color-muted-foreground") as string;

  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");

  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery(
    orpc.tracking.history.infiniteOptions({
      input: (pageParam: string | undefined) => ({
        limit: 30,
        cursor: pageParam,
        type: mediaType !== "all" ? mediaType : undefined,
      }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
  );

  const allItems = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  // Group by local calendar day, preserving newest-first order. The day key comes
  // from local getters; the heading formats the date-only key as UTC (see
  // intl-polyfills.ts: the native Intl polyfill defaults to UTC).
  const sections = useMemo(() => {
    const days: { key: string; title: string; data: typeof allItems }[] = [];
    for (const item of allItems) {
      const key = formatLocalDate(new Date(item.watchedAt));
      const last = days[days.length - 1];
      if (last && last.key === key) {
        last.data.push(item);
      } else {
        days.push({ key, title: formatDate(key, { weekday: "long" }), data: [item] });
      }
    }
    return days;
  }, [allItems]);

  const refreshHistory = useCallback(
    () => queryClient.invalidateQueries({ queryKey: orpc.tracking.history.key() }),
    [],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refreshHistory);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

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
    </ScrollView>
  );

  const isIOS = process.env.EXPO_OS === "ios";

  return (
    <>
      <Stack.Header
        transparent={isIOS}
        blurEffect={isIOS ? "systemChromeMaterialDark" : undefined}
        style={{
          color: tintColor,
          shadowColor: "transparent",
          backgroundColor: isIOS ? undefined : backgroundColor,
        }}
      />
      <Stack.Screen.Title style={headerTitleStyle as Record<string, unknown>}>
        {t`History`}
      </Stack.Screen.Title>
      <Stack.Screen.BackButton displayMode="minimal" />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.watchId}
        ListHeaderComponent={filterChips}
        renderItem={({ item }) => (
          <View className="px-4 py-1">
            <HistoryRow item={item} />
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
        ListFooterComponent={
          <LoadMoreFooter
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            onRetry={() => fetchNextPage()}
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          isPending ? null : isError && allItems.length === 0 ? (
            <EmptyState
              icon={IconAlertTriangle}
              title={t`Something went wrong`}
              description={t`Couldn't load your watch history`}
              actionLabel={t`Retry`}
              onAction={() => refetch()}
            />
          ) : (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="items-center justify-center px-4 py-16"
            >
              <ScaledIcon icon={IconHistory} size={48} color={`${mutedColor}66`} />
              <Text className="text-muted-foreground mt-4 text-center text-sm">
                {t`No watches yet.`}
              </Text>
            </Animated.View>
          )
        }
      />
    </>
  );
}
