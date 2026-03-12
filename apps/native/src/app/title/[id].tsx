import {
  IconCheck,
  IconList,
  IconMovie,
  IconPlayerPlay,
  IconSparkles,
  IconStarFilled,
  IconUsers,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CastCard } from "@/components/titles/cast-card";
import { SeasonAccordion } from "@/components/titles/season-accordion";
import { StatusActionButton } from "@/components/titles/status-action-button";
import { ExpandableText } from "@/components/ui/expandable-text";
import { PosterCard } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import * as Haptics from "@/utils/haptics";
import { orpc, queryClient } from "@/utils/orpc";

export default function TitleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { back } = useRouter();

  const detail = useQuery(orpc.titles.detail.queryOptions({ input: { id } }));
  const userInfo = useQuery(
    orpc.titles.userInfo.queryOptions({ input: { id } }),
  );
  const recommendations = useQuery(
    orpc.titles.recommendations.queryOptions({ input: { id } }),
  );

  const updateStatus = useMutation(
    orpc.titles.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
    }),
  );

  const updateRating = useMutation(
    orpc.titles.updateRating.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
      },
    }),
  );

  const watchMovie = useMutation(
    orpc.titles.watchMovie.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
    }),
  );

  const watchAll = useMutation(
    orpc.titles.watchAll.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
    }),
  );

  const quickAddMutation = useMutation(
    orpc.titles.quickAdd.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
    }),
  );

  const hydrateMutation = useMutation(
    orpc.titles.hydrateSeasons.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
      },
    }),
  );

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
  }, []);

  const title = detail.data?.title;
  const seasons = detail.data?.seasons ?? [];
  const cast = detail.data?.cast ?? [];
  const availability = detail.data?.availability ?? [];
  const watchedEpisodeIds = useMemo(
    () => new Set(userInfo.data?.episodeWatches ?? []),
    [userInfo.data?.episodeWatches],
  );

  const hydratedTitleId = useRef<string | null>(null);
  useEffect(() => {
    if (
      detail.data?.needsHydration &&
      title?.type === "tv" &&
      hydratedTitleId.current !== id
    ) {
      hydratedTitleId.current = id;
      hydrateMutation.mutate({ id, tmdbId: title.tmdbId });
    }
  }, [
    detail.data?.needsHydration,
    title?.type,
    title?.tmdbId,
    id,
    hydrateMutation.mutate,
  ]);

  if (detail.isPending) {
    return (
      <View style={{ backgroundColor: colors.background, flex: 1 }}>
        <Stack.Screen
          options={{
            title: "",
            headerTransparent: true,
            headerBlurEffect: "none",
            headerTintColor: "white",
            headerBackButtonDisplayMode: "minimal",
            headerTitle: "",
          }}
        />
        {/* Hero skeleton */}
        <Skeleton width="100%" height={300} borderRadius={0} />
        {/* Genre chips skeleton */}
        <View
          className="mt-3 flex-row"
          style={{ paddingHorizontal: 16, gap: 8 }}
        >
          <Skeleton width={60} height={24} borderRadius={12} />
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={50} height={24} borderRadius={12} />
        </View>
        {/* Actions skeleton */}
        <View
          className="mt-4 flex-row"
          style={{ paddingHorizontal: 16, gap: 8 }}
        >
          <Skeleton width={100} height={36} borderRadius={18} />
          <Skeleton width={90} height={36} borderRadius={18} />
          <Skeleton width={105} height={36} borderRadius={18} />
        </View>
        {/* Overview skeleton */}
        <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 8 }}>
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="70%" height={14} />
        </View>
      </View>
    );
  }

  if (!title) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: colors.background,
        }}
      >
        <Stack.Screen
          options={{
            title: "",
            headerTransparent: true,
            headerBlurEffect: "none",
            headerTintColor: "white",
            headerBackButtonDisplayMode: "minimal",
            headerTitle: "",
          }}
        />
        <IconMovie size={48} color={colors.mutedForeground} />
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 20,
            color: colors.foreground,
            marginTop: 12,
          }}
        >
          Title not found
        </Text>
        <Pressable onPress={() => back()} className="mt-4">
          <Text style={{ color: colors.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const year = (title.releaseDate ?? title.firstAirDate)?.slice(0, 4);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      refreshControl={
        <RefreshControl
          refreshing={detail.isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Stack.Screen
        options={{
          title: title?.title ?? "",
          headerTransparent: true,
          headerBlurEffect: "none",
          headerTintColor: "white",
          headerBackButtonDisplayMode: "minimal",
          headerTitle: "",
        }}
      />

      {/* Hero */}
      <View style={{ height: 300 }}>
        {title.backdropPath && (
          <Image
            source={{ uri: title.backdropPath }}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
            }}
            contentFit="cover"
          />
        )}
        <View
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        />

        <View className="absolute right-0 bottom-0 left-0 flex-row items-end p-4">
          {title.posterPath && (
            <View
              style={{
                width: 100,
                height: 150,
                borderRadius: 8,
                borderCurve: "continuous",
                overflow: "hidden",
                marginRight: 12,
              }}
            >
              <Image
                source={{ uri: title.posterPath }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                contentFit="cover"
              />
            </View>
          )}
          <View className="flex-1 pb-1">
            <Text
              selectable
              style={{
                fontFamily: fonts.display,
                fontSize: 24,
                color: "white",
              }}
              numberOfLines={2}
            >
              {title.title}
            </Text>
            <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: colors.primary }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: fonts.sansMedium,
                    color: colors.primaryForeground,
                  }}
                >
                  {title.type === "movie" ? "Movie" : "TV"}
                </Text>
              </View>
              {year ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {year}
                </Text>
              ) : null}
              {title.contentRating ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {title.contentRating}
                </Text>
              ) : null}
              {title.voteAverage != null && title.voteAverage > 0 && (
                <View className="flex-row items-center gap-0.5">
                  <IconStarFilled size={12} color={colors.primary} />
                  <Text style={{ fontSize: 12, color: colors.primary }}>
                    {title.voteAverage.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Genres */}
      {title.genres && title.genres.length > 0 && (
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {title.genres.map((genre: string) => (
              <View
                key={genre}
                className="mr-2 rounded-full px-2.5 py-1"
                style={{ backgroundColor: colors.secondary }}
              >
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                  {genre}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Actions */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(200)}
        className="mt-4 px-4"
      >
        <StatusActionButton
          currentStatus={userInfo.data?.status ?? null}
          onStatusChange={(status) => {
            if (status === null) {
              updateStatus.mutate({ id, status: null });
            } else if (status === "watchlist") {
              quickAddMutation.mutate({
                tmdbId: title.tmdbId,
                type: title.type,
              });
            } else if (status === "completed" && title.type === "movie") {
              watchMovie.mutate({ id });
            } else if (status === "completed" && title.type === "tv") {
              watchAll.mutate({ id });
            } else {
              updateStatus.mutate({ id, status });
            }
          }}
          isPending={
            updateStatus.isPending ||
            quickAddMutation.isPending ||
            watchMovie.isPending ||
            watchAll.isPending
          }
        />

        <View className="mt-4 flex-row items-center justify-between">
          <StarRating
            rating={userInfo.data?.rating ?? 0}
            onRate={(stars) => updateRating.mutate({ id, stars })}
          />

          {title.type === "movie" && (
            <Pressable
              onPress={() => watchMovie.mutate({ id })}
              disabled={watchMovie.isPending}
              className="flex-row items-center gap-1.5 rounded-full px-4 py-2"
              style={{ backgroundColor: colors.primary }}
            >
              {watchMovie.isPending ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primaryForeground}
                />
              ) : (
                <>
                  <IconCheck size={16} color={colors.primaryForeground} />
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 13,
                      color: colors.primaryForeground,
                    }}
                  >
                    Mark Watched
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Overview */}
      {title.overview ? (
        <Animated.View entering={FadeIn.duration(300).delay(300)}>
          <View className="mt-5 px-4">
            <ExpandableText text={title.overview} />
          </View>
        </Animated.View>
      ) : null}

      {/* Availability */}
      {availability.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300).delay(400)}
          className="mt-6"
        >
          <View className="px-4">
            <SectionHeader title="Where to Watch" icon={IconPlayerPlay} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {availability.map((offer) => (
              <View key={offer.providerName} className="mr-4 items-center">
                {offer.logoPath && (
                  <Image
                    source={{ uri: offer.logoPath }}
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                    contentFit="cover"
                  />
                )}
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.mutedForeground,
                    marginTop: 4,
                    textAlign: "center",
                    maxWidth: 60,
                  }}
                  numberOfLines={1}
                >
                  {offer.providerName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Seasons & Episodes */}
      {title.type === "tv" && seasons.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300).delay(400)}
          className="mt-6 px-4"
        >
          <SectionHeader title="Seasons" icon={IconList} />
          {seasons.map((season) => (
            <SeasonAccordion
              key={season.id}
              season={season}
              episodes={season.episodes ?? []}
              watchedEpisodeIds={watchedEpisodeIds}
            />
          ))}
        </Animated.View>
      )}

      {hydrateMutation.isPending && (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.primary} />
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 13,
              marginTop: 8,
            }}
          >
            Loading season data...
          </Text>
        </View>
      )}

      {/* Cast */}
      {cast.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300).delay(500)}
          className="mt-6"
        >
          <View className="px-4">
            <SectionHeader title="Cast" icon={IconUsers} />
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={cast}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CastCard person={item} />}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </Animated.View>
      )}

      {/* Recommendations */}
      {recommendations.data &&
        recommendations.data.recommendations?.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(600)}
            className="mt-6"
          >
            <View className="px-4">
              <SectionHeader title="More Like This" icon={IconSparkles} />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recommendations.data.recommendations}
              keyExtractor={(item) => item.id ?? String(item.tmdbId)}
              renderItem={({ item }) => (
                <View className="mr-3">
                  <PosterCard
                    id={item.id}
                    tmdbId={item.tmdbId}
                    title={item.title}
                    type={item.type}
                    posterPath={item.posterPath}
                    releaseDate={item.releaseDate ?? item.firstAirDate}
                    voteAverage={item.voteAverage}
                    userStatus={
                      item.id
                        ? (recommendations.data?.userStatuses?.[item.id] ??
                          null)
                        : null
                    }
                  />
                </View>
              )}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </Animated.View>
        )}
    </ScrollView>
  );
}
