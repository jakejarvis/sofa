import {
  IconBrandAppstore,
  IconBrandGooglePlay,
  IconCheck,
  IconList,
  IconMovie,
  IconPlayerPlay,
  IconStarFilled,
  IconThumbUp,
  IconUsers,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { CastCard } from "@/components/titles/cast-card";
import { ContinueWatchingBanner } from "@/components/titles/continue-watching-banner";
import { SeasonAccordion } from "@/components/titles/season-accordion";
import { StatusActionButton } from "@/components/titles/status-action-button";
import { ExpandableText } from "@/components/ui/expandable-text";
import { Image } from "@/components/ui/image";
import { PosterCard } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Text } from "@/components/ui/text";
import { useTitleTheme } from "@/hooks/use-title-theme";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";

export default function TitleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { back } = useRouter();

  const [titleAccent, mutedForeground, titleAccentForeground] = useCSSVariable([
    "--color-title-accent",
    "--color-muted-foreground",
    "--color-title-accent-foreground",
  ]) as [string, string, string];

  const detail = useQuery(orpc.titles.detail.queryOptions({ input: { id } }));
  const userInfo = useQuery(
    orpc.titles.userInfo.queryOptions({ input: { id } }),
  );
  const recommendations = useQuery(
    orpc.titles.recommendations.queryOptions({ input: { id } }),
  );

  const updateStatus = useMutation(
    orpc.titles.updateStatus.mutationOptions({
      onSuccess: (_data, { status }) => {
        const statusMessages: Record<string, string> = {
          watchlist: "Added to watchlist",
          in_progress: "Marked as watching",
          completed: "Marked as completed",
        };
        toast.success(
          status
            ? (statusMessages[status] ?? "Status updated")
            : "Removed from library",
        );
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => toast.error("Failed to update status"),
    }),
  );

  const updateRating = useMutation(
    orpc.titles.updateRating.mutationOptions({
      onSuccess: (_data, { stars }) => {
        toast.success(
          stars > 0
            ? `Rated ${stars} star${stars > 1 ? "s" : ""}`
            : "Rating removed",
        );
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
      },
      onError: () => toast.error("Failed to update rating"),
    }),
  );

  const watchMovie = useMutation(
    orpc.titles.watchMovie.mutationOptions({
      onSuccess: () => {
        toast.success(
          title?.title
            ? `Marked "${title.title}" as watched`
            : "Marked as watched",
        );
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => toast.error("Failed to mark as watched"),
    }),
  );

  const watchAll = useMutation(
    orpc.titles.watchAll.mutationOptions({
      onSuccess: () => {
        toast.success("Marked all episodes as watched");
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => toast.error("Failed to mark all episodes as watched"),
    }),
  );

  const quickAddMutation = useMutation(
    orpc.titles.quickAdd.mutationOptions({
      onSuccess: () => {
        toast.success("Added to watchlist");
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => toast.error("Failed to add to watchlist"),
    }),
  );

  const hydrateMutation = useMutation(
    orpc.titles.hydrateSeasons.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
      },
    }),
  );

  const [_refreshing, setRefreshing] = useState(false);
  const _onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
    setRefreshing(false);
  }, []);

  const title = detail.data?.title;
  const palette = title?.colorPalette ?? null;
  useTitleTheme(palette);

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
      <View className="flex-1 bg-background">
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
        <View className="mt-3 flex-row gap-2 px-4">
          <Skeleton width={60} height={24} borderRadius={12} />
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={50} height={24} borderRadius={12} />
        </View>
        {/* Actions skeleton */}
        <View className="mt-4 flex-row gap-2 px-4">
          <Skeleton width={100} height={36} borderRadius={18} />
          <Skeleton width={90} height={36} borderRadius={18} />
          <Skeleton width={105} height={36} borderRadius={18} />
        </View>
        {/* Overview skeleton */}
        <View className="mt-5 gap-2 px-4">
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="70%" height={14} />
        </View>
      </View>
    );
  }

  if (!title) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
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
        <IconMovie size={48} color={mutedForeground} />
        <Text className="mt-3 font-display text-foreground text-xl">
          Title not found
        </Text>
        <Pressable onPress={() => back()} className="mt-4">
          <Text className="text-primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const year = (title.releaseDate ?? title.firstAirDate)?.slice(0, 4);

  return (
    <ScrollView
      className="bg-background"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
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
      <View className="h-[300px]">
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
        {/* Backdrop overlay: glass effect on supported devices, colored Views elsewhere */}
        {isLiquidGlassAvailable() && palette?.vibrant ? (
          <GlassView
            glassEffectStyle="regular"
            tintColor={palette.vibrant}
            className="absolute inset-0"
          />
        ) : (
          <>
            {/* Base darkening overlay */}
            <View
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            />
            {/* Colored tint from palette */}
            {palette?.darkMuted && (
              <View
                className="absolute inset-0"
                style={{ backgroundColor: palette.darkMuted, opacity: 0.25 }}
              />
            )}
            {palette?.vibrant && (
              <View
                className="absolute inset-0"
                style={{ backgroundColor: palette.vibrant, opacity: 0.06 }}
              />
            )}
          </>
        )}
        {/* Bottom fade to background */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.95)"]}
          locations={[0, 0.5, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "70%",
          }}
        />

        {title.trailerVideoKey && (
          <Pressable
            onPress={() =>
              WebBrowser.openBrowserAsync(
                `https://www.youtube.com/watch?v=${title.trailerVideoKey}`,
              )
            }
            className="absolute inset-0 items-center justify-center"
          >
            <View
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              <IconPlayerPlay size={28} color="white" fill="white" />
            </View>
          </Pressable>
        )}

        <View className="absolute right-0 bottom-0 left-0 flex-row items-end p-4">
          {title.posterPath && (
            <View
              className="mr-3 h-[150px] w-[100px] overflow-hidden rounded-lg"
              style={[
                { borderCurve: "continuous" },
                palette?.darkVibrant
                  ? {
                      boxShadow: `0 12px 28px -8px ${palette.darkVibrant}80`,
                    }
                  : undefined,
              ]}
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
              className="font-display text-2xl text-white"
              numberOfLines={2}
            >
              {title.title}
            </Text>
            <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
              <View className="rounded-full bg-title-accent px-2 py-0.5">
                <Text className="font-sans-medium text-[10px] text-title-accent-foreground">
                  {title.type === "movie" ? "Movie" : "TV"}
                </Text>
              </View>
              {year ? (
                <Text className="text-[13px] text-white/70">{year}</Text>
              ) : null}
              {title.contentRating ? (
                <Text className="text-white/50 text-xs">
                  {title.contentRating}
                </Text>
              ) : null}
              {title.voteAverage != null && title.voteAverage > 0 && (
                <View className="flex-row items-center gap-0.5">
                  <IconStarFilled size={12} color={titleAccent} />
                  <Text className="text-title-accent text-xs">
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
                className="mr-2 rounded-full bg-secondary px-2.5 py-1"
              >
                <Text className="text-[11px] text-muted-foreground">
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
            accentColor={titleAccent}
          />

          {title.type === "movie" && (
            <Pressable
              onPress={() => watchMovie.mutate({ id })}
              disabled={watchMovie.isPending}
              className="flex-row items-center gap-1.5 rounded-full bg-title-accent px-4 py-2"
            >
              {watchMovie.isPending ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <IconCheck size={16} color={titleAccentForeground} />
                  <Text className="font-sans-medium text-[13px] text-title-accent-foreground">
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
            <SectionHeader
              title="Where to Watch"
              icon={
                Platform.OS === "ios" ? IconBrandAppstore : IconBrandGooglePlay
              }
              iconColor={titleAccent}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
          >
            {availability.map((offer) => (
              <View
                key={`${offer.providerId}-${offer.offerType}`}
                className="items-center"
              >
                {offer.logoPath && (
                  <Image
                    source={{ uri: offer.logoPath }}
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                    contentFit="cover"
                  />
                )}
                <Text
                  className="mt-1 max-w-[60px] text-center text-[10px] text-muted-foreground"
                  numberOfLines={1}
                >
                  {offer.providerName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Continue Watching */}
      {title.type === "tv" && (
        <ContinueWatchingBanner
          seasons={seasons}
          watchedEpisodeIds={watchedEpisodeIds}
          userStatus={userInfo.data?.status ?? null}
          backdropPath={title.backdropPath}
        />
      )}

      {/* Seasons & Episodes */}
      {title.type === "tv" && seasons.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300).delay(400)}
          className="mt-6 px-4"
        >
          <SectionHeader
            title="Seasons"
            icon={IconList}
            iconColor={titleAccent}
          />
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
          <Spinner colorClassName="accent-title-accent" />
          <Text className="mt-2 text-[13px] text-muted-foreground">
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
            <SectionHeader
              title="Cast"
              icon={IconUsers}
              iconColor={titleAccent}
            />
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={cast}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item }) => <CastCard person={item} />}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
            style={{ overflow: "visible" }}
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
              <SectionHeader
                title="More Like This"
                icon={IconThumbUp}
                iconColor={titleAccent}
              />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recommendations.data.recommendations}
              keyExtractor={(item) => item.id ?? String(item.tmdbId)}
              renderItem={({ item }) => (
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
                      ? (recommendations.data?.userStatuses?.[item.id] ?? null)
                      : null
                  }
                />
              )}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
              style={{ overflow: "visible" }}
            />
          </Animated.View>
        )}
    </ScrollView>
  );
}
