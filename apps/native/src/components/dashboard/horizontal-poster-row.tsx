import { FlashList } from "@shopify/flash-list";
import { useCallback } from "react";

import {
  HorizontalListSeparator,
  horizontalListContentStyle,
  horizontalListStyle,
} from "@/components/ui/horizontal-list-spacing";
import { PosterCard, PosterCardSkeleton } from "@/components/ui/poster-card";
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
}: {
  items: PosterRowItem[];
  isLoading?: boolean;
}) {
  const { quickAdd } = useTitleActions();
  const handleQuickAdd = useCallback((id: string) => quickAdd.mutate({ id }), [quickAdd]);
  const addingKey = quickAdd.isPending ? (quickAdd.variables?.id ?? null) : null;
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
