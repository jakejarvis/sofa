import {
  IconBookmarkFilled,
  IconCheckbox,
  IconDeviceTv,
  IconLoader,
  IconMovie,
  IconPlayerPlayFilled,
  IconPlus,
  IconStarFilled,
} from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { Image } from "@/components/ui/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { client, orpc, queryClient } from "@/utils/orpc";
import { toast } from "@/utils/toast";

type TitleStatus = "watchlist" | "in_progress" | "completed";

interface PosterCardProps {
  id?: string;
  tmdbId: number;
  title: string;
  type: "movie" | "tv";
  posterPath: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  userStatus?: TitleStatus | null;
  episodeProgress?: { watched: number; total: number } | null;
  width?: number;
}

export function PosterCard({
  id,
  tmdbId,
  title,
  type,
  posterPath,
  releaseDate,
  voteAverage,
  userStatus,
  episodeProgress,
  width = 140,
}: PosterCardProps) {
  const { navigate } = useRouter();
  const primaryColor = useCSSVariable("--color-primary") as string;
  const watchlistColor = useCSSVariable("--color-status-watchlist") as string;
  const watchingColor = useCSSVariable("--color-status-watching") as string;
  const completedColor = useCSSVariable("--color-status-completed") as string;

  const statusColors: Record<TitleStatus, string> = {
    watchlist: watchlistColor,
    in_progress: watchingColor,
    completed: completedColor,
  };

  const pressed = useSharedValue(0);
  const [localStatus, setLocalStatus] = useState<TitleStatus | null>(
    userStatus ?? null,
  );

  useEffect(() => {
    setLocalStatus(userStatus ?? null);
  }, [userStatus]);

  const resolveMutation = useMutation(
    orpc.titles.resolve.mutationOptions({
      onSuccess: ({ id: resolvedId }) => {
        if (resolvedId) {
          navigate(`/title/${resolvedId}`);
        }
      },
      onError: () => toast.error("Failed to load title"),
    }),
  );

  const quickAddMutation = useMutation(
    orpc.titles.quickAdd.mutationOptions({
      onSuccess: () => {
        setLocalStatus("watchlist");
        toast.success("Added to watchlist");
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => toast.error("Failed to add to watchlist"),
    }),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pressed.get(), [0, 1], [1, 0.97]),
      },
    ],
  }));

  const handleResolve = useCallback(() => {
    resolveMutation.mutate({ tmdbId, type });
  }, [tmdbId, type, resolveMutation]);

  const handleQuickAdd = useCallback(() => {
    if (localStatus || quickAddMutation.isPending) return;
    quickAddMutation.mutate({ tmdbId, type });
  }, [localStatus, quickAddMutation, tmdbId, type]);

  const year = releaseDate?.slice(0, 4);
  const imageHeight = width * 1.5;

  const cardContent = (
    <View
      className={`overflow-hidden rounded-xl border bg-card ${
        localStatus ? "border-primary/25" : "border-white/[0.06]"
      }`}
      style={{ borderCurve: "continuous" }}
    >
      {/* Poster image */}
      <View style={{ width, height: imageHeight }}>
        {posterPath ? (
          <Image
            source={{ uri: posterPath }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            recyclingKey={`poster-${tmdbId}`}
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-secondary p-3">
            <Text className="text-center font-display text-[13px] text-foreground/[0.44]">
              {title}
            </Text>
          </View>
        )}

        {/* Quick-add button */}
        {!localStatus && (
          <Pressable
            onPress={handleQuickAdd}
            className="absolute top-2 right-2 size-[30px] items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            {quickAddMutation.isPending ? (
              <IconLoader size={16} color="white" />
            ) : (
              <IconPlus size={16} color="white" />
            )}
          </Pressable>
        )}

        {/* Status indicator */}
        {localStatus && (
          <View
            className="absolute top-2 right-2 size-[30px] items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            {localStatus === "completed" ? (
              <IconCheckbox size={16} color="white" />
            ) : localStatus === "in_progress" ? (
              <IconPlayerPlayFilled size={16} color="white" />
            ) : (
              <IconBookmarkFilled size={16} color="white" />
            )}
          </View>
        )}

        {/* Episode progress bar */}
        {episodeProgress &&
          episodeProgress.total > 0 &&
          episodeProgress.watched > 0 && (
            <View
              className="absolute right-0 bottom-0 left-0 h-[3px]"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <View
                className="h-full bg-status-watching"
                style={{
                  width: `${episodeProgress.total > 0 ? (episodeProgress.watched / episodeProgress.total) * 100 : 0}%`,
                }}
              />
            </View>
          )}
      </View>

      {/* Metadata */}
      <View className="px-2.5 pt-2 pb-2.5">
        <View className="flex-row items-center gap-1.5">
          {localStatus && (
            <View
              className="size-1.5 rounded-full"
              style={{ backgroundColor: statusColors[localStatus] }}
            />
          )}
          <Text
            className="flex-1 font-sans-medium text-[13px] text-foreground"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center gap-2">
          {type === "movie" ? (
            <IconMovie size={12} color={primaryColor} opacity={0.6} />
          ) : (
            <IconDeviceTv size={12} color={primaryColor} opacity={0.6} />
          )}
          {year ? (
            <Text className="text-[11px] text-muted-foreground">{year}</Text>
          ) : null}
          {voteAverage != null && voteAverage > 0 && (
            <View className="ml-auto flex-row items-center gap-0.5">
              <IconStarFilled size={10} color={primaryColor} opacity={0.8} />
              <Text className="text-[11px] text-primary/80">
                {voteAverage.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // Gesture for UI-thread press animation (used by both paths)
  const pressGesture = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withSpring(1, { damping: 15, stiffness: 300 }));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, { damping: 15, stiffness: 300 }));
    });

  // Cards with id: use Link with native preview and context menu
  if (id) {
    return (
      <Link href={`/title/${id}` as `/title/${string}`}>
        <Link.Trigger>
          <GestureDetector gesture={pressGesture}>
            <Animated.View style={[animatedStyle, { width }]}>
              {cardContent}
            </Animated.View>
          </GestureDetector>
        </Link.Trigger>
        <Link.Preview />
        <Link.Menu>
          {!localStatus && (
            <Link.MenuAction
              title="Add to Watchlist"
              icon="bookmark"
              onPress={handleQuickAdd}
            />
          )}
          {localStatus !== "in_progress" && (
            <Link.MenuAction
              title="Mark as Watching"
              icon="play.fill"
              onPress={async () => {
                await client.titles.updateStatus({
                  id,
                  status: "in_progress",
                });
                toast.success("Added to watchlist");
                queryClient.invalidateQueries({
                  queryKey: orpc.titles.key(),
                });
                queryClient.invalidateQueries({
                  queryKey: orpc.dashboard.key(),
                });
              }}
            />
          )}
          {type === "movie" && (
            <Link.MenuAction
              title="Mark as Watched"
              icon="checkmark.circle"
              onPress={async () => {
                await client.titles.watchMovie({ id });
                toast.success(
                  title ? `Marked "${title}" as watched` : "Marked as watched",
                );
                queryClient.invalidateQueries({
                  queryKey: orpc.titles.key(),
                });
                queryClient.invalidateQueries({
                  queryKey: orpc.dashboard.key(),
                });
              }}
            />
          )}
          {localStatus && (
            <Link.MenuAction
              title="Remove from Library"
              icon="trash"
              destructive
              onPress={async () => {
                await client.titles.updateStatus({ id, status: null });
                setLocalStatus(null);
                toast.success("Removed from library");
                queryClient.invalidateQueries({
                  queryKey: orpc.titles.key(),
                });
                queryClient.invalidateQueries({
                  queryKey: orpc.dashboard.key(),
                });
              }}
            />
          )}
        </Link.Menu>
      </Link>
    );
  }

  // Cards without id: use GestureDetector for resolve-then-navigate
  const resolveTapGesture = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withSpring(1, { damping: 15, stiffness: 300 }));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, { damping: 15, stiffness: 300 }));
    })
    .onEnd(() => {
      runOnJS(handleResolve)();
    });

  return (
    <GestureDetector gesture={resolveTapGesture}>
      <Animated.View style={[animatedStyle, { width }]}>
        {cardContent}
      </Animated.View>
    </GestureDetector>
  );
}

export function PosterCardSkeleton({ width = 140 }: { width?: number }) {
  const imageHeight = width * 1.5;
  return (
    <View
      className="overflow-hidden rounded-xl border border-white/[0.06] bg-card"
      style={{
        width,
        borderCurve: "continuous",
      }}
    >
      <Skeleton width={width} height={imageHeight} borderRadius={0} />
      <View className="px-2.5 pt-2 pb-2.5">
        <Skeleton width="75%" height={14} />
        <Skeleton width="50%" height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}
