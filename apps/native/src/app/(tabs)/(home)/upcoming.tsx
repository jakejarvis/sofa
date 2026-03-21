import { Trans, useLingui } from "@lingui/react/macro";
import { IconCalendarEvent } from "@tabler/icons-react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useCallback, useMemo } from "react";
import { RefreshControl, SectionList, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCSSVariable, useResolveClassNames } from "uniwind";

import { UpcomingRow } from "@/components/dashboard/upcoming-row";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { groupByDateBucket } from "@sofa/i18n/date-buckets";

const contentContainerStyle = { paddingBottom: 24 };

export default function UpcomingScreen() {
  const { t } = useLingui();
  const headerTitleStyle = useResolveClassNames("font-display text-foreground text-xl");
  const tintColor = useCSSVariable("--color-primary") as string;
  const backgroundColor = useCSSVariable("--color-background") as string;
  const mutedColor = useCSSVariable("--color-muted-foreground") as string;

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } =
    useInfiniteQuery(
      orpc.dashboard.upcoming.infiniteOptions({
        input: (pageParam: string | undefined) => ({
          days: 90,
          limit: 20,
          cursor: pageParam,
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

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orpc.dashboard.upcoming.key() });
  }, []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
      {!isPending && allItems.length === 0 ? (
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="flex-1 items-center justify-center px-4"
        >
          <ScaledIcon icon={IconCalendarEvent} size={48} color={`${mutedColor}66`} />
          <Text className="text-muted-foreground mt-4 text-center text-sm">
            <Trans>No upcoming episodes or releases in the next 90 days.</Trans>
          </Text>
        </Animated.View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => `${item.titleId}-${item.date}-${i}`}
          renderItem={({ item }) => (
            <View className="px-4 py-1">
              <UpcomingRow item={item} />
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View className="bg-background px-4 pt-4 pb-1">
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
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        />
      )}
    </>
  );
}
