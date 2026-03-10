import {
  IconDeviceTv,
  IconFlame,
  IconMovie,
  IconStarFilled,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PosterCard, PosterCardSkeleton } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { orpc, queryClient } from "@/utils/orpc";

function GenreChip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mr-2 rounded-full px-3 py-1.5"
      style={{
        backgroundColor: isSelected ? colors.primary : colors.secondary,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 12,
          color: isSelected ? colors.primaryForeground : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function HeroBanner({
  item,
}: {
  item: {
    id?: string;
    tmdbId: number;
    title: string;
    type: string;
    backdropPath?: string | null;
    overview?: string | null;
    voteAverage?: number | null;
    releaseDate?: string | null;
  };
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        if (item.id) router.push(`/title/${item.id}`);
      }}
      className="mx-4 overflow-hidden rounded-2xl"
      style={{ height: 220 }}
    >
      {item.backdropPath && (
        <Image
          source={{ uri: item.backdropPath }}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          contentFit="cover"
        />
      )}
      <View
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      />
      <View className="flex-1 justify-end p-4">
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 24,
            color: "white",
          }}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.overview && (
          <Text
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              marginTop: 4,
            }}
            numberOfLines={2}
          >
            {item.overview}
          </Text>
        )}
        <View className="mt-2 flex-row items-center gap-2">
          {item.voteAverage != null && item.voteAverage > 0 && (
            <View className="flex-row items-center gap-1">
              <IconStarFilled size={12} color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.primary }}>
                {item.voteAverage.toFixed(1)}
              </Text>
            </View>
          )}
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            {item.releaseDate?.slice(0, 4)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function FilterableTitleRow({
  title,
  icon,
  items,
  genres,
  isLoading,
}: {
  title: string;
  icon: typeof IconMovie;
  items: Array<{
    id?: string;
    tmdbId: number;
    title: string;
    type: string;
    posterPath: string | null;
    releaseDate?: string | null;
    voteAverage?: number | null;
    userStatus?: "watchlist" | "in_progress" | "completed" | null;
    episodeProgress?: { watched: number; total: number } | null;
  }>;
  genres?: Array<{ id: number; name: string }>;
  isLoading?: boolean;
}) {
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  const filteredItems = selectedGenre
    ? items.filter(
        (item) =>
          "genreIds" in item &&
          (item as { genreIds?: number[] }).genreIds?.includes(selectedGenre),
      )
    : items;

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

      {isLoading ? (
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
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filteredItems}
          keyExtractor={(item, index) => item.id ?? `${item.tmdbId}-${index}`}
          renderItem={({ item }) => (
            <View className="mr-3">
              <PosterCard
                id={item.id}
                tmdbId={item.tmdbId}
                title={item.title}
                type={item.type as "movie" | "tv"}
                posterPath={item.posterPath}
                releaseDate={item.releaseDate}
                voteAverage={item.voteAverage}
                userStatus={item.userStatus}
                episodeProgress={item.episodeProgress}
              />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      )}
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

  const trending = useQuery(
    orpc.explore.trending.queryOptions({ input: { type: "all" } }),
  );
  const popularMovies = useQuery(
    orpc.explore.popular.queryOptions({ input: { type: "movie" } }),
  );
  const popularTv = useQuery(
    orpc.explore.popular.queryOptions({ input: { type: "tv" } }),
  );
  const movieGenres = useQuery(
    orpc.explore.genres.queryOptions({ input: { type: "movie" } }),
  );
  const tvGenres = useQuery(
    orpc.explore.genres.queryOptions({ input: { type: "tv" } }),
  );

  const isRefreshing =
    trending.isRefetching ||
    popularMovies.isRefetching ||
    popularTv.isRefetching;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries();
  }, []);

  const heroItem = trending.data?.hero;
  const trendingItems = trending.data?.items ?? [];

  return (
    <FlatList
      data={[1]}
      keyExtractor={() => "explore"}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 16,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      renderItem={() => (
        <View className="gap-8">
          {heroItem && <HeroBanner item={heroItem} />}

          <FilterableTitleRow
            title="Trending Today"
            icon={IconFlame}
            items={trendingItems}
            isLoading={trending.isPending}
          />

          <FilterableTitleRow
            title="Popular Movies"
            icon={IconMovie}
            items={popularMovies.data?.items ?? []}
            genres={movieGenres.data?.genres}
            isLoading={popularMovies.isPending}
          />

          <FilterableTitleRow
            title="Popular TV Shows"
            icon={IconDeviceTv}
            items={popularTv.data?.items ?? []}
            genres={tvGenres.data?.genres}
            isLoading={popularTv.isPending}
          />
        </View>
      )}
    />
  );
}
