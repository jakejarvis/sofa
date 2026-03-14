import type { Icon } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import {
  HorizontalPosterRow,
  type PosterRowItem,
} from "@/components/dashboard/horizontal-poster-row";
import { GenreChip } from "@/components/explore/genre-chip";
import { SectionHeader } from "@/components/ui/section-header";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";

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

  const rawItems =
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

  // Map items into PosterRowItem shape with status/progress resolved
  const items = useMemo<PosterRowItem[]>(
    () =>
      rawItems.map((item) => {
        const key = `${item.tmdbId}-${item.type}`;
        return {
          ...item,
          userStatus: userStatuses[key] ?? null,
          episodeProgress: episodeProgress[key] ?? null,
        };
      }),
    [rawItems, userStatuses, episodeProgress],
  );

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

      {!showLoading && items.length === 0 && selectedGenre !== null ? (
        <View className="items-center py-6">
          <Text className="text-[13px] text-muted-foreground">
            No titles found for this genre.
          </Text>
        </View>
      ) : (
        <HorizontalPosterRow items={items} isLoading={showLoading} />
      )}
    </View>
  );
}
