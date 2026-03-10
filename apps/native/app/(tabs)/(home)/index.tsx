import {
  IconLibrary,
  IconPlayerPlay,
  IconSparkles,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { PosterCard, PosterCardSkeleton } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

function StatsCard({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <View
      className="mr-3 rounded-xl px-4 py-3"
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        minWidth: 120,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansBold,
          fontSize: 24,
          color: colors.primary,
        }}
      >
        {value ?? "—"}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: colors.mutedForeground,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function HorizontalPosterRow({
  items,
  isLoading,
}: {
  items: Array<{
    id: string;
    tmdbId: number;
    title: string;
    type: string;
    posterPath: string | null;
    releaseDate?: string | null;
    voteAverage?: number | null;
    userStatus?: "watchlist" | "in_progress" | "completed" | null;
    episodeProgress?: { watched: number; total: number } | null;
  }>;
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
            releaseDate={item.releaseDate}
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

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const stats = useQuery(orpc.dashboard.stats.queryOptions());
  const continueWatching = useQuery(
    orpc.dashboard.continueWatching.queryOptions(),
  );
  const library = useQuery(orpc.dashboard.library.queryOptions());
  const recommendations = useQuery(
    orpc.dashboard.recommendations.queryOptions(),
  );

  const isRefreshing =
    stats.isRefetching || continueWatching.isRefetching || library.isRefetching;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries();
  }, []);

  const hasLibrary = (library.data?.items?.length ?? 0) > 0;
  const hasContinueWatching = (continueWatching.data?.items?.length ?? 0) > 0;
  const hasRecommendations = (recommendations.data?.items?.length ?? 0) > 0;

  return (
    <FlatList
      data={[1]}
      keyExtractor={() => "dashboard"}
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
          {/* Welcome */}
          <View className="px-4">
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                color: colors.foreground,
              }}
            >
              Welcome, {session?.user?.name?.split(" ")[0] ?? "there"}
            </Text>
          </View>

          {/* Stats */}
          <View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                {
                  label: "Movies this month",
                  value: stats.data?.moviesThisMonth,
                },
                {
                  label: "Episodes this week",
                  value: stats.data?.episodesThisWeek,
                },
                { label: "In library", value: stats.data?.librarySize },
                { label: "Completed", value: stats.data?.completed },
              ]}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <StatsCard label={item.label} value={item.value} />
              )}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </View>

          {/* Continue Watching */}
          {hasContinueWatching && (
            <View>
              <View className="px-4">
                <SectionHeader
                  title="Continue Watching"
                  icon={IconPlayerPlay}
                />
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={continueWatching.data?.items ?? []}
                keyExtractor={(item) => item.title.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => router.push(`/title/${item.title.id}`)}
                    className="mr-3 overflow-hidden rounded-xl"
                    style={{
                      width: 200,
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.06)",
                    }}
                  >
                    <View style={{ width: 200, height: 112 }}>
                      {item.title.backdropPath && (
                        <Image
                          source={{ uri: item.title.backdropPath }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      )}
                      <View
                        className="absolute right-0 bottom-0 left-0"
                        style={{
                          height: 3,
                          backgroundColor: "rgba(255,255,255,0.1)",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${(item.watchedEpisodes / item.totalEpisodes) * 100}%`,
                            backgroundColor: colors.statusWatching,
                          }}
                        />
                      </View>
                    </View>
                    <View className="p-2.5">
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: fonts.sansMedium,
                          fontSize: 13,
                          color: colors.foreground,
                        }}
                      >
                        {item.title.title}
                      </Text>
                      {item.nextEpisode && (
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 11,
                            color: colors.mutedForeground,
                            marginTop: 2,
                          }}
                        >
                          S{item.nextEpisode.seasonNumber}E
                          {item.nextEpisode.episodeNumber}
                          {item.nextEpisode.name
                            ? ` · ${item.nextEpisode.name}`
                            : ""}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                )}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              />
            </View>
          )}

          {/* Library */}
          <View>
            <View className="px-4">
              <SectionHeader title="Your Library" icon={IconLibrary} />
            </View>
            {hasLibrary ? (
              <HorizontalPosterRow
                items={library.data?.items ?? []}
                isLoading={library.isPending}
              />
            ) : (
              !library.isPending && (
                <EmptyState
                  title="Your library is empty"
                  description="Start tracking movies and shows"
                  actionLabel="Explore"
                  onAction={() => router.push("/(tabs)/(explore)")}
                />
              )
            )}
          </View>

          {/* Recommendations */}
          {hasRecommendations && (
            <View>
              <View className="px-4">
                <SectionHeader
                  title="Recommended for You"
                  icon={IconSparkles}
                />
              </View>
              <HorizontalPosterRow
                items={recommendations.data?.items ?? []}
                isLoading={recommendations.isPending}
              />
            </View>
          )}
        </View>
      )}
    />
  );
}
