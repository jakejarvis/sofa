import { Trans, useLingui } from "@lingui/react/macro";
import { FlashList } from "@shopify/flash-list";
import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconBooks,
} from "@tabler/icons-react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import type { LibraryFilters } from "@/components/library/filter-sheet";
import { FilterSheet } from "@/components/library/filter-sheet";
import { SortMenu } from "@/components/library/sort-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { PosterCard } from "@/components/ui/poster-card";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useDebounce } from "@/hooks/use-debounce";
import { useTitleActions } from "@/hooks/use-title-actions";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

type SortBy = "added_at" | "title" | "release_date" | "user_rating" | "vote_average" | "popularity";
type SortDirection = "asc" | "desc";

const NUM_COLUMNS = 2;
const HORIZONTAL_PADDING = 16;

const gridContentContainerStyle = {
  paddingHorizontal: HORIZONTAL_PADDING,
  paddingTop: 8,
  paddingBottom: 16,
};

export default function LibraryScreen() {
  const { t } = useLingui();
  const foregroundColor = useCSSVariable("--color-foreground") as string;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);

  const [filters, setFilters] = useState<LibraryFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("added_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSortChange = useCallback((newSortBy: SortBy, newDirection: SortDirection) => {
    setSortBy(newSortBy);
    setSortDirection(newDirection);
  }, []);

  const handleApplyFilters = useCallback((newFilters: LibraryFilters) => {
    setFilters(newFilters);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.statuses && filters.statuses.length > 0) count++;
    if (filters.type) count++;
    if (filters.genreId !== undefined) count++;
    if (filters.ratingMin !== undefined || filters.ratingMax !== undefined) count++;
    if (filters.yearMin !== undefined || filters.yearMax !== undefined) count++;
    if (filters.contentRating) count++;
    if (filters.onMyServices) count++;
    return count;
  }, [filters]);

  const libraryQuery = useInfiniteQuery({
    ...orpc.library.list.infiniteOptions({
      input: (pageParam: number) => ({
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
        statuses:
          filters.statuses && filters.statuses.length > 0
            ? (filters.statuses as ("in_watchlist" | "watching" | "caught_up" | "completed")[])
            : undefined,
        type: filters.type as "movie" | "tv" | undefined,
        genreId: filters.genreId,
        ratingMin: filters.ratingMin,
        ratingMax: filters.ratingMax,
        yearMin: filters.yearMin,
        yearMax: filters.yearMax,
        contentRating: filters.contentRating,
        onMyServices: filters.onMyServices,
        sortBy,
        sortDirection,
        page: pageParam,
        limit: 20,
      }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      maxPages: 20,
    }),
  });

  const { quickAdd } = useTitleActions();
  const handleQuickAdd = useCallback((id: string) => quickAdd.mutate({ id }), [quickAdd]);
  const addingId = quickAdd.isPending ? (quickAdd.variables?.id ?? null) : null;

  const allItems = useMemo(
    () => libraryQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [libraryQuery.data?.pages],
  );

  const isRefreshing = libraryQuery.isRefetching && !libraryQuery.isFetchingNextPage;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orpc.library.key() });
  }, []);

  type LibraryItem = (typeof allItems)[number];

  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) => (
      <View className="flex-1 px-1.5 pb-3">
        <PosterCard
          id={item.id}
          title={item.title}
          type={item.type as "movie" | "tv"}
          posterPath={item.posterPath}
          posterThumbHash={item.posterThumbHash}
          releaseDate={item.releaseDate ?? item.firstAirDate}
          voteAverage={item.voteAverage}
          userStatus={item.userStatus}
          onQuickAdd={handleQuickAdd}
          isAdding={addingId === item.id}
        />
      </View>
    ),
    [handleQuickAdd, addingId],
  );

  const keyExtractor = useCallback((item: LibraryItem) => item.id, []);

  const filterButton = (
    <View className="flex-row items-center gap-4">
      <SortMenu sortBy={sortBy} sortDirection={sortDirection} onSortChange={handleSortChange} />
      <Pressable
        onPress={() => setFilterOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t`Filters`}
        hitSlop={8}
      >
        <View className="flex-row items-center">
          <ScaledIcon icon={IconAdjustmentsHorizontal} size={22} color={foregroundColor} />
          {activeFilterCount > 0 && (
            <View className="bg-primary -mt-2 -ml-1.5 size-4 items-center justify-center rounded-full">
              <Text className="text-primary-foreground text-[10px] font-bold">
                {activeFilterCount}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );

  return (
    <View collapsable={false} className="bg-background flex-1">
      <Stack.Screen
        options={{
          headerRight: () => filterButton,
        }}
      />
      <Stack.SearchBar
        placeholder={t`Search your library...`}
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearch("")}
        onClose={() => setSearch("")}
        hideWhenScrolling={false}
        placement={process.env.EXPO_OS === "ios" ? "integrated" : undefined}
        allowToolbarIntegration={process.env.EXPO_OS === "ios" ? true : undefined}
      />

      {libraryQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <Spinner colorClassName="accent-primary" />
        </View>
      ) : libraryQuery.isError ? (
        <EmptyState
          icon={IconAlertTriangle}
          title={t`Something went wrong`}
          description={t`Could not load your library`}
          actionLabel={t`Retry`}
          onAction={() => libraryQuery.refetch()}
        />
      ) : allItems.length === 0 ? (
        <Animated.View entering={FadeIn.duration(300)} className="flex-1">
          {debouncedSearch.length > 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-muted-foreground text-base">
                <Trans>No results for "{debouncedSearch}"</Trans>
              </Text>
            </View>
          ) : activeFilterCount > 0 ? (
            <EmptyState
              icon={IconAdjustmentsHorizontal}
              title={t`No matching titles`}
              description={t`Try adjusting your filters`}
              actionLabel={t`Clear filters`}
              onAction={() => setFilters({})}
            />
          ) : (
            <EmptyState
              icon={IconBooks}
              title={t`Your library is empty`}
              description={t`Start tracking movies and shows`}
            />
          )}
        </Animated.View>
      ) : (
        <FlashList
          data={allItems}
          numColumns={NUM_COLUMNS}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={gridContentContainerStyle}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          onEndReached={() => {
            if (libraryQuery.hasNextPage && !libraryQuery.isFetchingNextPage) {
              libraryQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            libraryQuery.isFetchingNextPage ? (
              <View className="items-center py-4">
                <Spinner />
              </View>
            ) : null
          }
        />
      )}

      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </View>
  );
}
