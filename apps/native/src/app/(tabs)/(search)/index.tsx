import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { RecentlyViewedList } from "@/components/search/recently-viewed-list";
import {
  type SearchResultItem,
  SearchResultRow,
} from "@/components/search/search-result-row";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useDebounce } from "@/hooks/use-debounce";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";
import * as Haptics from "@/utils/haptics";

export default function SearchScreen() {
  const { navigate } = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);

  const searchResults = useQuery({
    ...orpc.search.queryOptions({ input: { query: debouncedQuery } }),
    enabled: debouncedQuery.length > 0,
  });

  // Track which item is currently being resolved/added
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const resolveTitleMutation = useMutation(
    orpc.titles.resolve.mutationOptions({
      onSuccess: ({ id }) => {
        setResolvingId(null);
        if (id) navigate(`/title/${id}`);
      },
      onError: () => {
        setResolvingId(null);
        toast.error("Failed to load title");
      },
    }),
  );

  const resolvePersonMutation = useMutation(
    orpc.people.resolve.mutationOptions({
      onSuccess: ({ id }) => {
        setResolvingId(null);
        if (id) navigate(`/person/${id}`);
      },
      onError: () => {
        setResolvingId(null);
        toast.error("Failed to load person");
      },
    }),
  );

  const quickAddMutation = useMutation(
    orpc.titles.quickAdd.mutationOptions({
      onSuccess: () => {
        setAddingId(null);
        toast.success("Added to watchlist");
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => {
        setAddingId(null);
        toast.error("Failed to add to watchlist");
      },
    }),
  );

  // Use refs for mutation.mutate to keep callbacks stable across renders
  const resolveTitleMutateRef = useRef(resolveTitleMutation.mutate);
  resolveTitleMutateRef.current = resolveTitleMutation.mutate;
  const resolvePersonMutateRef = useRef(resolvePersonMutation.mutate);
  resolvePersonMutateRef.current = resolvePersonMutation.mutate;
  const quickAddMutateRef = useRef(quickAddMutation.mutate);
  quickAddMutateRef.current = quickAddMutation.mutate;

  const handleResolve = useCallback((item: SearchResultItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResolvingId(`${item.type}-${item.tmdbId}`);
    if (item.type === "person") {
      resolvePersonMutateRef.current({ tmdbId: item.tmdbId });
    } else {
      resolveTitleMutateRef.current({ tmdbId: item.tmdbId, type: item.type });
    }
  }, []);

  const handleQuickAdd = useCallback((tmdbId: number, type: "movie" | "tv") => {
    setAddingId(`${type}-${tmdbId}`);
    quickAddMutateRef.current({ tmdbId, type });
  }, []);

  // Memoize mapped results to maintain stable references
  const allResults = useMemo<SearchResultItem[]>(
    () =>
      searchResults.data?.results?.map((r) => ({
        tmdbId: r.tmdbId,
        title: r.title,
        type: r.type,
        posterPath: r.posterPath,
        profilePath: r.profilePath,
        releaseDate: r.releaseDate,
      })) ?? [],
    [searchResults.data?.results],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResultItem }) => (
      <SearchResultRow
        item={item}
        onResolve={handleResolve}
        onQuickAdd={handleQuickAdd}
        isResolving={resolvingId === `${item.type}-${item.tmdbId}`}
        isAdding={addingId === `${item.type}-${item.tmdbId}`}
      />
    ),
    [handleResolve, handleQuickAdd, resolvingId, addingId],
  );

  const keyExtractor = useCallback(
    (item: SearchResultItem) => `${item.type}-${item.tmdbId}`,
    [],
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: "Search movies, shows, people...",
            onChangeText: (e) => setQuery(e.nativeEvent.text),
            hideWhenScrolling: false,
          },
        }}
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
          <Text className="text-[15px] text-muted-foreground">
            No results for "{debouncedQuery}"
          </Text>
        </Animated.View>
      ) : (
        <FlashList
          data={allResults}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        />
      )}
    </View>
  );
}
