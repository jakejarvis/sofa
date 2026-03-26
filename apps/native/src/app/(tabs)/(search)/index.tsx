import { Trans, useLingui } from "@lingui/react/macro";
import { FlashList } from "@shopify/flash-list";
import { skipToken, useInfiniteQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { RecentlyViewedList } from "@/components/search/recently-viewed-list";
import { type SearchResultItem, SearchResultRow } from "@/components/search/search-result-row";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useDebounce } from "@/hooks/use-debounce";
import { useTitleActions } from "@/hooks/use-title-actions";
import { orpc } from "@/lib/orpc";

export default function SearchScreen() {
  const { t } = useLingui();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);

  const searchResults = useInfiniteQuery({
    ...orpc.discover.search.infiniteOptions({
      input:
        debouncedQuery.length > 0
          ? (pageParam: number) => ({ query: debouncedQuery, page: pageParam })
          : skipToken,
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      maxPages: 10,
    }),
  });

  const { quickAdd: quickAddMutation } = useTitleActions();

  const handleQuickAdd = useCallback(
    (id: string) => {
      quickAddMutation.mutate({ id });
    },
    [quickAddMutation],
  );

  // Memoize mapped results to maintain stable references
  const allResults = useMemo<SearchResultItem[]>(
    () =>
      searchResults.data?.pages.flatMap((page) =>
        page.results.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          posterPath: r.posterPath,
          profilePath: r.profilePath,
          releaseDate: r.releaseDate,
        })),
      ) ?? [],
    [searchResults.data?.pages],
  );

  const addingId = quickAddMutation.isPending ? (quickAddMutation.variables?.id ?? null) : null;

  const renderItem = useCallback(
    ({ item }: { item: SearchResultItem }) => (
      <SearchResultRow item={item} onQuickAdd={handleQuickAdd} isAdding={addingId === item.id} />
    ),
    [handleQuickAdd, addingId],
  );

  const keyExtractor = useCallback((item: SearchResultItem) => `${item.type}-${item.id}`, []);
  const getItemType = useCallback(
    (item: SearchResultItem) => (item.type === "person" ? "person" : "title"),
    [],
  );

  return (
    <View collapsable={false} className="bg-background flex-1">
      <Stack.SearchBar
        placeholder={t`Search movies, shows, people...`}
        onChangeText={(e) => setQuery(e.nativeEvent.text)}
        onCancelButtonPress={() => setQuery("")}
        onClose={() => setQuery("")}
        hideWhenScrolling={false}
        placement={process.env.EXPO_OS === "ios" ? "integrated" : undefined}
        allowToolbarIntegration={process.env.EXPO_OS === "ios" ? true : undefined}
      />

      {debouncedQuery.length === 0 ? (
        <RecentlyViewedList />
      ) : searchResults.isPending ? (
        <View className="flex-1 items-center justify-center">
          <Spinner colorClassName="accent-primary" />
        </View>
      ) : allResults.length === 0 ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          className="flex-1 items-center justify-center"
        >
          <Text className="text-muted-foreground text-base">
            <Trans>No results for "{debouncedQuery}"</Trans>
          </Text>
        </Animated.View>
      ) : (
        <FlashList
          data={allResults}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          onEndReached={() => {
            if (searchResults.hasNextPage && !searchResults.isFetchingNextPage) {
              searchResults.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            searchResults.isFetchingNextPage ? (
              <View className="items-center py-4">
                <Spinner />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
