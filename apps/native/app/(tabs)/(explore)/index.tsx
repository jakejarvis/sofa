import {
  IconDeviceTv,
  IconFlame,
  IconMovie,
  IconStarFilled,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
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
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
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
    tmdbId: number;
    title: string;
    type: string;
    backdropPath?: string | null;
    overview?: string | null;
    voteAverage?: number | null;
    releaseDate?: string | null;
  };
}) {
  const { push } = useRouter();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.98]) }],
  }));

  const resolveMutation = useMutation(
    orpc.titles.resolve.mutationOptions({
      onSuccess: ({ id }) => {
        push(`/title/${id}`);
      },
    }),
  );

  const handlePress = useCallback(() => {
    resolveMutation.mutate({
      tmdbId: item.tmdbId,
      type: item.type as "movie" | "tv",
    });
  }, [item.tmdbId, item.type, resolveMutation]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withSpring(1, { damping: 15, stiffness: 300 }));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, { damping: 15, stiffness: 300 }));
    })
    .onEnd(() => {
      runOnJS(handlePress)();
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        className="mx-4 overflow-hidden rounded-2xl"
        style={[
          animatedStyle,
          { height: 220, opacity: resolveMutation.isPending ? 0.7 : 1 },
        ]}
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
          {item.overview ? (
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
          ) : null}
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
      </Animated.View>
    </GestureDetector>
  );
}

type TitleStatus = "watchlist" | "in_progress" | "completed";

function FilterableTitleRow({
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
  icon: typeof IconMovie;
  mediaType: "movie" | "tv";
  defaultItems: Array<{
    tmdbId: number;
    title: string;
    type: string;
    posterPath: string | null;
    releaseDate?: string | null;
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
      input: { mediaType, genreId: selectedGenre ?? 0 },
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
          renderItem={() => (
            <View className="mr-3">
              <PosterCardSkeleton />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      ) : items.length === 0 && selectedGenre !== null ? (
        <View className="items-center py-6">
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
            No titles found for this genre.
          </Text>
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={(item, index) => `${item.tmdbId}-${index}`}
          renderItem={({ item }) => (
            <View className="mr-3">
              <PosterCard
                tmdbId={item.tmdbId}
                title={item.title}
                type={item.type as "movie" | "tv"}
                posterPath={item.posterPath}
                releaseDate={item.releaseDate}
                voteAverage={item.voteAverage}
                userStatus={userStatuses[`${item.tmdbId}-${item.type}`] ?? null}
                episodeProgress={
                  episodeProgress[`${item.tmdbId}-${item.type}`] ?? null
                }
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
    queryClient.invalidateQueries({ queryKey: orpc.explore.key() });
  }, []);

  const heroItem = trending.data?.hero;

  return (
    <ScrollView
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
    >
      <View className="gap-8">
        {heroItem && (
          <Animated.View entering={FadeIn.duration(400)}>
            <HeroBanner item={heroItem} />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <FilterableTitleRow
            title="Trending Today"
            icon={IconFlame}
            mediaType="movie"
            defaultItems={trending.data?.items ?? []}
            defaultUserStatuses={trending.data?.userStatuses ?? {}}
            defaultEpisodeProgress={trending.data?.episodeProgress ?? {}}
            isLoading={trending.isPending}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <FilterableTitleRow
            title="Popular Movies"
            icon={IconMovie}
            mediaType="movie"
            defaultItems={popularMovies.data?.items ?? []}
            defaultUserStatuses={popularMovies.data?.userStatuses ?? {}}
            defaultEpisodeProgress={popularMovies.data?.episodeProgress ?? {}}
            genres={movieGenres.data?.genres}
            isLoading={popularMovies.isPending}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <FilterableTitleRow
            title="Popular TV Shows"
            icon={IconDeviceTv}
            mediaType="tv"
            defaultItems={popularTv.data?.items ?? []}
            defaultUserStatuses={popularTv.data?.userStatuses ?? {}}
            defaultEpisodeProgress={popularTv.data?.episodeProgress ?? {}}
            genres={tvGenres.data?.genres}
            isLoading={popularTv.isPending}
          />
        </Animated.View>
      </View>
    </ScrollView>
  );
}
