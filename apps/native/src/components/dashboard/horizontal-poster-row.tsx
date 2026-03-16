import { FlashList } from "@shopify/flash-list";
import { useCallback } from "react";

import {
  HorizontalListSeparator,
  horizontalListContentStyle,
  horizontalListStyle,
} from "@/components/ui/horizontal-list-spacing";
import { PosterCard, PosterCardSkeleton } from "@/components/ui/poster-card";
import { usePosterActions } from "@/hooks/use-poster-actions";

export interface PosterRowItem {
  id?: string;
  tmdbId: number;
  title: string;
  type: string;
  posterPath: string | null;
  posterThumbHash?: string | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  voteAverage?: number | null;
  userStatus?: "watchlist" | "in_progress" | "completed" | null;
  episodeProgress?: { watched: number; total: number } | null;
}

export function HorizontalPosterRow({
  items,
  isLoading,
}: {
  items: PosterRowItem[];
  isLoading?: boolean;
}) {
  const { handlePress, handleQuickAdd, addingKey, failedKey, resetError } =
    usePosterActions();
  const keyExtractor = useCallback(
    (item: PosterRowItem) => item.id ?? `${item.tmdbId}-${item.type}`,
    [],
  );
  const renderItem = useCallback(
    ({ item }: { item: PosterRowItem }) => (
      <PosterCard
        id={item.id}
        tmdbId={item.tmdbId}
        title={item.title}
        type={item.type as "movie" | "tv"}
        posterPath={item.posterPath}
        posterThumbHash={item.posterThumbHash}
        releaseDate={item.releaseDate ?? item.firstAirDate}
        voteAverage={item.voteAverage}
        userStatus={item.userStatus}
        episodeProgress={item.episodeProgress}
        onPress={handlePress}
        onQuickAdd={handleQuickAdd}
        isAdding={addingKey === `${item.tmdbId}-${item.type}`}
        failedKey={failedKey}
        onQuickAddFailed={resetError}
      />
    ),
    [addingKey, failedKey, handlePress, handleQuickAdd, resetError],
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
      ItemSeparatorComponent={HorizontalListSeparator}
      contentContainerStyle={horizontalListContentStyle}
      style={horizontalListStyle}
    />
  );
}
