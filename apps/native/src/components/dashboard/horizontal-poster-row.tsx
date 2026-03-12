import { FlatList, View } from "react-native";

import { PosterCard, PosterCardSkeleton } from "@/components/ui/poster-card";

export interface PosterRowItem {
  id: string;
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

export function HorizontalPosterRow({
  items,
  isLoading,
}: {
  items: PosterRowItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[1, 2, 3, 4]}
        keyExtractor={(item) => String(item)}
        renderItem={() => (
          <View className="mr-3">
            <PosterCardSkeleton />
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    );
  }

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="mr-3">
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
          />
        </View>
      )}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    />
  );
}
