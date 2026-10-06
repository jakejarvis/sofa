import { FlashList } from "@shopify/flash-list";
import { useCallback } from "react";
import { View } from "react-native";

import {
  HorizontalListSeparator,
  horizontalListContentStyle,
  horizontalListStyle,
} from "@/components/ui/horizontal-list-spacing";
import { PosterCard, PosterCardSkeleton } from "@/components/ui/poster-card";
import { Spinner } from "@/components/ui/spinner";
import { useTitleActions } from "@/hooks/use-title-actions";

export interface PosterRowItem {
  id: string;
  title: string;
  type: string;
  posterPath: string | null;
  posterThumbHash?: string | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  voteAverage?: number | null;
  userStatus?: "in_watchlist" | "watching" | "caught_up" | "completed" | null;
  episodeProgress?: { watched: number; total: number } | null;
}

export function HorizontalPosterRow({
  items,
  isLoading,
  onEndReached,
  isFetchingNextPage,
}: {
  items: PosterRowItem[];
  isLoading?: boolean;
  /** Called when the user scrolls near the end of the row (load more). */
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
}) {
  const { updateStatus } = useTitleActions();
  const handleQuickAdd = useCallback(
    (id: string) => updateStatus.mutate({ id, status: "watchlist" }),
    [updateStatus],
  );
  const addingKey = updateStatus.isPending ? (updateStatus.variables?.id ?? null) : null;
  const keyExtractor = useCallback((item: PosterRowItem) => item.id, []);
  const renderItem = useCallback(
    ({ item }: { item: PosterRowItem }) => (
      <PosterCard
        id={item.id}
        title={item.title}
        type={item.type as "movie" | "tv"}
        posterPath={item.posterPath}
        posterThumbHash={item.posterThumbHash}
        releaseDate={item.releaseDate ?? item.firstAirDate}
        voteAverage={item.voteAverage}
        userStatus={item.userStatus}
        episodeProgress={item.episodeProgress}
        onQuickAdd={handleQuickAdd}
        isAdding={addingKey === item.id}
      />
    ),
    [addingKey, handleQuickAdd],
  );

  const footer = useCallback(
    () =>
      isFetchingNextPage ? (
        <View className="h-full items-center justify-center px-4">
          <Spinner size="sm" />
        </View>
      ) : null,
    [isFetchingNextPage],
  );

  if (isLoading) {
    return (
      <FlashList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[1, 2, 3, 4]}
        keyExtractor={(item) => String(item)}
        renderItem={() => <PosterCardSkeleton />}
        ItemSeparatorComponent={HorizontalListSeparator}
        contentContainerStyle={horizontalListContentStyle}
        style={horizontalListStyle}
      />
    );
  }

  return (
    <FlashList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={footer}
      ItemSeparatorComponent={HorizontalListSeparator}
      contentContainerStyle={horizontalListContentStyle}
      style={horizontalListStyle}
    />
  );
}
