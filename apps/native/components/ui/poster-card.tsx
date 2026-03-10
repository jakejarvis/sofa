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
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Skeleton } from "@/components/ui/skeleton";
import { useTitleActions } from "@/components/ui/title-action-sheet";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { orpc, queryClient } from "@/utils/orpc";

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

const statusColors: Record<TitleStatus, string> = {
  watchlist: colors.statusWatchlist,
  in_progress: colors.statusWatching,
  completed: colors.statusCompleted,
};

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
  const router = useRouter();
  const { showActions } = useTitleActions();
  const pressed = useSharedValue(0);
  const [localStatus, setLocalStatus] = useState<TitleStatus | null>(
    userStatus ?? null,
  );

  useEffect(() => {
    if (userStatus) setLocalStatus(userStatus);
  }, [userStatus]);

  const resolveMutation = useMutation(
    orpc.titles.resolve.mutationOptions({
      onSuccess: ({ id: resolvedId }) => {
        if (resolvedId) {
          router.push(`/title/${resolvedId}`);
        }
      },
    }),
  );

  const quickAddMutation = useMutation(
    orpc.watchlist.quickAdd.mutationOptions({
      onSuccess: () => {
        setLocalStatus("watchlist");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
      },
    }),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pressed.get(), [0, 1], [1, 0.97]),
      },
    ],
  }));

  const handlePress = useCallback(() => {
    if (id) {
      router.push(`/title/${id}`);
    } else {
      resolveMutation.mutate({ tmdbId, type });
    }
  }, [id, tmdbId, type, router, resolveMutation]);

  const handleLongPress = useCallback(() => {
    showActions({
      id,
      tmdbId,
      title,
      type,
      userStatus: localStatus,
    });
  }, [id, tmdbId, title, type, localStatus, showActions]);

  const handleQuickAdd = useCallback(() => {
    if (localStatus || quickAddMutation.isPending) return;
    quickAddMutation.mutate({ tmdbId, type });
  }, [localStatus, quickAddMutation, tmdbId, type]);

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

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      runOnJS(handleLongPress)();
    });

  const composedGesture = Gesture.Race(tapGesture, longPressGesture);

  const year = releaseDate?.slice(0, 4);
  const imageHeight = width * 1.5;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[animatedStyle, { width }]}>
      <View
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: localStatus
            ? `${colors.primary}40`
            : "rgba(255,255,255,0.06)",
        }}
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
            <View
              className="flex-1 items-center justify-center p-3"
              style={{ backgroundColor: colors.secondary }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  color: `${colors.foreground}70`,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {title}
              </Text>
            </View>
          )}

          {/* Quick-add button */}
          {!localStatus && (
            <Pressable
              onPress={handleQuickAdd}
              className="absolute top-2 right-2 items-center justify-center rounded-full"
              style={{
                width: 30,
                height: 30,
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
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
              className="absolute top-2 right-2 items-center justify-center rounded-full"
              style={{
                width: 30,
                height: 30,
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
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
          {episodeProgress && episodeProgress.watched > 0 && (
            <View
              className="absolute right-0 bottom-0 left-0"
              style={{ height: 3, backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${(episodeProgress.watched / episodeProgress.total) * 100}%`,
                  backgroundColor: colors.statusWatching,
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
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: statusColors[localStatus],
                }}
              />
            )}
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: colors.foreground,
                flex: 1,
              }}
            >
              {title}
            </Text>
          </View>
          <View className="mt-1 flex-row items-center gap-2">
            {type === "movie" ? (
              <IconMovie size={12} color={`${colors.primary}99`} />
            ) : (
              <IconDeviceTv size={12} color={`${colors.primary}99`} />
            )}
            {year ? (
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                {year}
              </Text>
            ) : null}
            {voteAverage != null && voteAverage > 0 && (
              <View className="ml-auto flex-row items-center gap-0.5">
                <IconStarFilled size={10} color={`${colors.primary}cc`} />
                <Text style={{ fontSize: 11, color: `${colors.primary}cc` }}>
                  {voteAverage.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function PosterCardSkeleton({ width = 140 }: { width?: number }) {
  const imageHeight = width * 1.5;
  return (
    <View
      style={{
        width,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
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
