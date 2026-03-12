import type { Icon } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { GenreChip } from "@/components/explore/genre-chip";
import { PosterCard, PosterCardSkeleton } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Text } from "@/components/ui/text";
import { orpc } from "@/utils/orpc";

type TitleStatus = "watchlist" | "in_progress" | "completed";

export function FilterableTitleRow({
  title,
  icon,
  mediaType,
  defaultItems,
  defaultUserStatuses,
  defaultEpisodeProgress,
  genres,
  isLoading,
}: {
  title: string;
  icon: Icon;
  mediaType: "movie" | "tv";
  defaultItems: Array<{
    tmdbId: number;
    title: string;
    type: string;
    posterPath: string | null;
    releaseDate?: string | null;
    firstAirDate?: string | null;
    voteAverage?: number | null;
  }>;
  defaultUserStatuses: Record<string, TitleStatus>;
  defaultEpisodeProgress: Record<string, { watched: number; total: number }>;
  genres?: Array<{ id: number; name: string }>;
  isLoading?: boolean;
}) {
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  const discover = useQuery({
    ...orpc.discover.queryOptions({
      input: { type: mediaType, genreId: selectedGenre ?? 0 },
    }),
    enabled: selectedGenre !== null,
  });

  const items =
    selectedGenre === null ? defaultItems : (discover.data?.items ?? []);
  const userStatuses =
    selectedGenre === null
      ? defaultUserStatuses
      : (discover.data?.userStatuses ?? {});
  const episodeProgress =
    selectedGenre === null
      ? defaultEpisodeProgress
      : (discover.data?.episodeProgress ?? {});
  const showLoading =
    isLoading || (selectedGenre !== null && discover.isPending);

  return (
    <View>
      <View className="px-4">
        <SectionHeader title={title} icon={icon} />
      </View>

      {genres && genres.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <GenreChip
            label="All"
            isSelected={selectedGenre === null}
            onPress={() => setSelectedGenre(null)}
          />
          {genres.map((genre) => (
            <GenreChip
              key={genre.id}
              label={genre.name}
              isSelected={selectedGenre === genre.id}
              onPress={() =>
                setSelectedGenre(selectedGenre === genre.id ? null : genre.id)
              }
            />
          ))}
        </ScrollView>
      )}

      {showLoading ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[1, 2, 3, 4]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <PosterCardSkeleton />}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
          style={{ overflow: "visible" }}
        />
      ) : items.length === 0 && selectedGenre !== null ? (
        <View className="items-center py-6">
          <Text className="text-[13px] text-muted-foreground">
            No titles found for this genre.
          </Text>
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={(item) => `${item.tmdbId}-${item.type}`}
          renderItem={({ item }) => (
            <PosterCard
              tmdbId={item.tmdbId}
              title={item.title}
              type={item.type as "movie" | "tv"}
              posterPath={item.posterPath}
              releaseDate={item.releaseDate ?? item.firstAirDate}
              voteAverage={item.voteAverage}
              userStatus={userStatuses[`${item.tmdbId}-${item.type}`] ?? null}
              episodeProgress={
                episodeProgress[`${item.tmdbId}-${item.type}`] ?? null
              }
            />
          )}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
          style={{ overflow: "visible" }}
        />
      )}
    </View>
  );
}
