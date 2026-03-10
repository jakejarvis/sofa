import {
  IconArrowLeft,
  IconBookmark,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconList,
  IconMovie,
  IconPlayerPlay,
  IconSparkles,
  IconStarFilled,
  IconUsers,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import type { NativeSyntheticEvent, TextLayoutEventData } from "react-native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PosterCard } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { orpc, queryClient } from "@/utils/orpc";

type TitleStatus = "watchlist" | "in_progress" | "completed";

function StatusActionButton({
  currentStatus,
  onStatusChange,
  isPending,
}: {
  currentStatus: TitleStatus | null;
  onStatusChange: (status: TitleStatus | null) => void;
  isPending: boolean;
}) {
  const statuses: Array<{
    status: TitleStatus;
    label: string;
    Icon: typeof IconBookmark;
  }> = [
    { status: "watchlist", label: "Watchlist", Icon: IconBookmark },
    { status: "in_progress", label: "Watching", Icon: IconPlayerPlay },
    { status: "completed", label: "Completed", Icon: IconCircleCheck },
  ];

  return (
    <View className="flex-row gap-2">
      {statuses.map(({ status, label, Icon }) => {
        const isActive = currentStatus === status;
        return (
          <Pressable
            key={status}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onStatusChange(isActive ? null : status);
            }}
            disabled={isPending}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
            style={{
              backgroundColor: isActive ? `${colors.primary}20` : colors.card,
              borderWidth: 1,
              borderColor: isActive ? colors.primary : colors.border,
            }}
          >
            <Icon
              size={14}
              color={isActive ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 12,
                color: isActive ? colors.primary : colors.foreground,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EpisodeRow({
  episode,
  isWatched,
  onToggle,
}: {
  episode: {
    id: string;
    episodeNumber: number;
    name: string | null;
    airDate: string | null;
  };
  isWatched: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center px-4 py-3"
      style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}
    >
      {isWatched ? (
        <IconCircleCheckFilled size={22} color={colors.statusCompleted} />
      ) : (
        <IconCircleDashed size={22} color={colors.mutedForeground} />
      )}
      <View className="ml-3 flex-1">
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 14,
            color: isWatched ? colors.mutedForeground : colors.foreground,
          }}
          numberOfLines={1}
        >
          {episode.episodeNumber}.{" "}
          {episode.name ?? `Episode ${episode.episodeNumber}`}
        </Text>
        {episode.airDate && (
          <Text
            style={{
              fontSize: 11,
              color: colors.mutedForeground,
              marginTop: 2,
            }}
          >
            {episode.airDate}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function SeasonAccordion({
  season,
  episodes,
  watchedEpisodeIds,
}: {
  season: {
    id: string;
    seasonNumber: number;
    name: string | null;
  };
  episodes: Array<{
    id: string;
    episodeNumber: number;
    name: string | null;
    airDate: string | null;
  }>;
  watchedEpisodeIds: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const chevronRotation = useSharedValue(0);
  const watchedCount = episodes.filter((e) =>
    watchedEpisodeIds.has(e.id),
  ).length;
  const progress = episodes.length > 0 ? watchedCount / episodes.length : 0;

  useEffect(() => {
    chevronRotation.value = withTiming(expanded ? 180 : 0, { duration: 200 });
  }, [expanded, chevronRotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const watchEpisode = useMutation(
    orpc.episodes.watch.mutationOptions({
      onSuccess: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        queryClient.invalidateQueries();
      },
    }),
  );

  const unwatchEpisode = useMutation(
    orpc.episodes.unwatch.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
    }),
  );

  const watchSeason = useMutation(
    orpc.seasons.watch.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
      },
    }),
  );

  return (
    <View
      className="mb-2 overflow-hidden rounded-xl"
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between p-4"
      >
        <View className="flex-1">
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 15,
              color: colors.foreground,
            }}
          >
            {season.name ?? `Season ${season.seasonNumber}`}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              marginTop: 2,
            }}
          >
            {watchedCount}/{episodes.length} episodes
          </Text>
        </View>

        <View
          className="mx-3 overflow-hidden rounded-full"
          style={{
            width: 60,
            height: 4,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              backgroundColor:
                progress === 1 ? colors.statusCompleted : colors.statusWatching,
            }}
          />
        </View>

        <Animated.View style={chevronStyle}>
          <IconChevronDown size={18} color={colors.mutedForeground} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          {watchedCount < episodes.length && (
            <Pressable
              onPress={() => watchSeason.mutate({ id: season.id })}
              className="mx-4 mb-2 flex-row items-center justify-center rounded-lg py-2"
              style={{ backgroundColor: colors.secondary }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary,
                  fontFamily: fonts.sansMedium,
                }}
              >
                Mark All Watched
              </Text>
            </Pressable>
          )}

          {episodes.map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              isWatched={watchedEpisodeIds.has(episode.id)}
              onToggle={() => {
                if (watchedEpisodeIds.has(episode.id)) {
                  unwatchEpisode.mutate({ id: episode.id });
                } else {
                  watchEpisode.mutate({ id: episode.id });
                }
              }}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

function CastCard({
  person,
}: {
  person: {
    id: string;
    name: string;
    character: string | null;
    profilePath: string | null;
  };
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/person/${person.id}`)}
      className="mr-4 items-center"
      style={{ width: 80 }}
    >
      <View
        className="mb-2 overflow-hidden"
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.secondary,
        }}
      >
        {person.profilePath && (
          <Image
            source={{ uri: person.profilePath }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 11,
          color: colors.foreground,
          textAlign: "center",
        }}
      >
        {person.name}
      </Text>
      {person.character && (
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10,
            color: colors.mutedForeground,
            textAlign: "center",
          }}
        >
          {person.character}
        </Text>
      )}
    </Pressable>
  );
}

function ExpandableText({
  text,
  maxLines = 3,
}: {
  text: string;
  maxLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (!needsTruncation && e.nativeEvent.lines.length > maxLines) {
        setNeedsTruncation(true);
      }
    },
    [needsTruncation, maxLines],
  );

  return (
    <View className="mt-5 px-4">
      <Text
        numberOfLines={expanded ? undefined : maxLines}
        onTextLayout={onTextLayout}
        style={{
          fontSize: 14,
          lineHeight: 22,
          color: colors.foreground,
        }}
      >
        {text}
      </Text>
      {needsTruncation && (
        <Pressable onPress={() => setExpanded(!expanded)} className="mt-1">
          <Text
            style={{
              fontSize: 13,
              color: colors.primary,
              fontFamily: fonts.sansMedium,
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function TitleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const detail = useQuery(orpc.titles.detail.queryOptions({ input: { id } }));
  const userInfo = useQuery(
    orpc.titles.userInfo.queryOptions({ input: { id } }),
  );
  const recommendations = useQuery(
    orpc.titles.recommendations.queryOptions({ input: { id } }),
  );

  const updateStatus = useMutation(
    orpc.titles.updateStatus.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
    }),
  );

  const updateRating = useMutation(
    orpc.titles.updateRating.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
    }),
  );

  const watchMovie = useMutation(
    orpc.titles.watchMovie.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
      },
    }),
  );

  const quickAddMutation = useMutation(
    orpc.watchlist.quickAdd.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
      },
    }),
  );

  const hydrateMutation = useMutation(
    orpc.titles.hydrateSeasons.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
    }),
  );

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries();
  }, []);

  const title = detail.data?.title;
  const seasons = detail.data?.seasons ?? [];
  const cast = detail.data?.cast ?? [];
  const availability = detail.data?.availability ?? [];
  const watchedEpisodeIds = new Set(userInfo.data?.episodeWatches ?? []);

  if (detail.isPending) {
    return (
      <View style={{ backgroundColor: colors.background, flex: 1 }}>
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
          paddingTop: insets.top,
        }}
      >
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
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: colors.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const year = (title.releaseDate ?? title.firstAirDate)?.slice(0, 4);

  if (
    detail.data?.needsHydration &&
    title.type === "tv" &&
    !hydrateMutation.isPending &&
    !hydrateMutation.isSuccess
  ) {
    hydrateMutation.mutate({ id, tmdbId: title.tmdbId });
  }

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

        <Pressable
          onPress={() => router.back()}
          className="absolute items-center justify-center rounded-full"
          style={{
            top: insets.top + 8,
            left: 16,
            width: 36,
            height: 36,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <IconArrowLeft size={20} color="white" />
        </Pressable>

        <View className="absolute right-0 bottom-0 left-0 flex-row items-end p-4">
          {title.posterPath && (
            <Image
              source={{ uri: title.posterPath }}
              style={{
                width: 100,
                height: 150,
                borderRadius: 8,
                marginRight: 12,
              }}
              contentFit="cover"
            />
          )}
          <View className="flex-1 pb-1">
            <Text
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
              {year && (
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {year}
                </Text>
              )}
              {title.contentRating && (
                <Text
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {title.contentRating}
                </Text>
              )}
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
      )}

      {/* Actions */}
      <View className="mt-4 px-4">
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
            } else {
              updateStatus.mutate({ id, status: "in_progress" });
            }
          }}
          isPending={
            updateStatus.isPending ||
            quickAddMutation.isPending ||
            watchMovie.isPending
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
      </View>

      {/* Overview */}
      {title.overview && <ExpandableText text={title.overview} />}

      {/* Availability */}
      {availability.length > 0 && (
        <View className="mt-6">
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
        </View>
      )}

      {/* Seasons & Episodes */}
      {title.type === "tv" && seasons.length > 0 && (
        <View className="mt-6 px-4">
          <SectionHeader title="Seasons" icon={IconList} />
          {seasons.map((season) => (
            <SeasonAccordion
              key={season.id}
              season={season}
              episodes={season.episodes ?? []}
              watchedEpisodeIds={watchedEpisodeIds}
            />
          ))}
        </View>
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
        <View className="mt-6">
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
        </View>
      )}

      {/* Recommendations */}
      {recommendations.data &&
        recommendations.data.recommendations?.length > 0 && (
          <View className="mt-6">
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
                    releaseDate={item.releaseDate}
                    voteAverage={item.voteAverage}
                    userStatus={
                      recommendations.data?.userStatuses?.[item.id] ?? null
                    }
                  />
                </View>
              )}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </View>
        )}
    </ScrollView>
  );
}
