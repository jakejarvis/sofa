import { FlatList } from "react-native";

import { PosterCard, PosterCardSkeleton } from "@/components/ui/poster-card";
import { usePosterActions } from "@/hooks/use-poster-actions";

export interface PosterRowItem {
  id?: string;
  tmdbId: number;
  title: string;
  type: string;
  posterPath: string | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  voteAverage?: number | null;
  userStatus?: "watchlist" | "in_progress" | "completed" | null;
  episodeProgress?: { watched: number; total: number } | null;
}

const listContentStyle = { gap: 12, paddingHorizontal: 16 };
const listStyle = { overflow: "visible" as const };

export function HorizontalPosterRow({
  items,
  isLoading,
}: {
  items: PosterRowItem[];
  isLoading?: boolean;
}) {
  const { handlePress, handleQuickAdd, addingKey } = usePosterActions();

  if (isLoading) {
    return (
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[1, 2, 3, 4]}
        keyExtractor={(item) => String(item)}
        renderItem={() => <PosterCardSkeleton />}
        contentContainerStyle={listContentStyle}
        style={listStyle}
      />
    );
  }

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={items}
      keyExtractor={(item) => item.id ?? `${item.tmdbId}-${item.type}`}
      renderItem={({ item }) => (
        <PosterCard
          id={item.id}
          tmdbId={item.tmdbId}
          title={item.title}
          type={item.type as "movie" | "tv"}
          posterPath={item.posterPath}
          releaseDate={item.releaseDate ?? item.firstAirDate}
          voteAverage={item.voteAverage}
          userStatus={item.userStatus}
          episodeProgress={item.episodeProgress}
          onPress={handlePress}
          onQuickAdd={handleQuickAdd}
          isAdding={addingKey === `${item.tmdbId}-${item.type}`}
        />
      )}
      contentContainerStyle={listContentStyle}
      style={listStyle}
    />
  );
}
