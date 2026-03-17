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
import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import * as ContextMenu from "zeego/context-menu";
import { Image } from "@/components/ui/image";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { client, orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";

type TitleStatus = "watchlist" | "in_progress" | "completed";

interface PosterCardProps {
  id: string;
  title: string;
  type: "movie" | "tv";
  posterPath: string | null;
  posterThumbHash?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  userStatus?: TitleStatus | null;
  episodeProgress?: { watched: number; total: number } | null;
  width?: number;
  onQuickAdd: (id: string) => void;
  isAdding?: boolean;
  failedKey?: string | null;
  onQuickAddFailed?: () => void;
}

export function PosterCard({
  id,
  title,
  type,
  posterPath,
  posterThumbHash,
  releaseDate,
  voteAverage,
  userStatus,
  episodeProgress,
  width = 140,
  onQuickAdd,
  isAdding,
  failedKey,
  onQuickAddFailed,
}: PosterCardProps) {
  const primaryColor = useCSSVariable("--color-primary") as string;
  const watchlistColor = useCSSVariable("--color-status-watchlist") as string;
  const watchingColor = useCSSVariable("--color-status-watching") as string;
  const completedColor = useCSSVariable("--color-status-completed") as string;

  const statusColors: Record<TitleStatus, string> = {
    watchlist: watchlistColor,
    in_progress: watchingColor,
    completed: completedColor,
  };

  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const [localStatus, setLocalStatus] = useState<TitleStatus | null>(
    userStatus ?? null,
  );

  useEffect(() => {
    setLocalStatus(userStatus ?? null);
  }, [userStatus]);

  useEffect(() => {
    if (failedKey === id) {
      setLocalStatus(userStatus ?? null);
      onQuickAddFailed?.();
    }
  }, [failedKey, id, userStatus, onQuickAddFailed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: reduceMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.97]),
      },
    ],
  }));

  const handleQuickAddPress = useCallback(() => {
    if (localStatus || isAdding) return;
    setLocalStatus("watchlist");
    onQuickAdd(id);
  }, [localStatus, isAdding, onQuickAdd, id]);

  const year = releaseDate?.slice(0, 4);
  const imageHeight = width * 1.5;

  const statusLabel =
    localStatus === "completed"
      ? "completed"
      : localStatus === "in_progress"
        ? "watching"
        : localStatus === "watchlist"
          ? "on watchlist"
          : undefined;
  const cardAccessibilityLabel = [
    title,
    type === "movie" ? "movie" : "TV show",
    year,
    statusLabel,
  ]
    .filter(Boolean)
    .join(", ");

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
            thumbHash={posterThumbHash}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            recyclingKey={`poster-${id}`}
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-secondary p-3">
            <Text className="text-center font-display text-foreground/[0.44] text-sm">
              {title}
            </Text>
          </View>
        )}

        {/* Status indicator */}
        {localStatus && (
          <View
            accessible={false}
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
            className="flex-1 font-medium font-sans text-foreground text-sm"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center gap-1" accessible={false}>
          {type === "movie" ? (
            <ScaledIcon icon={IconMovie} size={12} color={primaryColor} />
          ) : (
            <ScaledIcon icon={IconDeviceTv} size={12} color={primaryColor} />
          )}
          {year ? (
            <Text className="text-muted-foreground text-xs">{year}</Text>
          ) : null}
          {voteAverage != null && voteAverage > 0 && (
            <View className="ml-auto flex-row items-center gap-1">
              <ScaledIcon
                icon={IconStarFilled}
                size={10}
                color={primaryColor}
              />
              <Text className="text-primary text-xs">
                {voteAverage.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
  const quickAddButton = !localStatus ? (
    <Pressable
      onPress={handleQuickAddPress}
      disabled={!!isAdding}
      accessibilityRole="button"
      accessibilityLabel={`Add ${title} to watchlist`}
      accessibilityState={{ disabled: !!isAdding }}
      className="absolute top-1 right-1 size-[44px] items-center justify-center rounded-full"
    >
      <View
        className="size-[30px] items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        {isAdding ? (
          <IconLoader size={16} color="white" />
        ) : (
          <IconPlus size={16} color="white" />
        )}
      </View>
    </Pressable>
  ) : null;

  // Gesture for UI-thread press animation (used by both paths)
  const pressGesture = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withSpring(1, { damping: 15, stiffness: 300 }));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, { damping: 15, stiffness: 300 }));
    });

  const titleHref = `/title/${id}` as `/title/${string}`;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <GestureDetector gesture={pressGesture}>
          <Animated.View style={[animatedStyle, { width }]}>
            <View>
              <Link href={titleHref} asChild>
                <Link.Trigger withAppleZoom>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={cardAccessibilityLabel}
                  >
                    {cardContent}
                  </Pressable>
                </Link.Trigger>
                <Link.Preview />
              </Link>
              {quickAddButton}
            </View>
          </Animated.View>
        </GestureDetector>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        {!localStatus && (
          <ContextMenu.Item key="watchlist" onSelect={handleQuickAddPress}>
            <ContextMenu.ItemIcon ios={{ name: "bookmark" }} />
            <ContextMenu.ItemTitle>Add to Watchlist</ContextMenu.ItemTitle>
          </ContextMenu.Item>
        )}
        {localStatus !== "in_progress" && (
          <ContextMenu.Item
            key="watching"
            onSelect={async () => {
              await client.titles.updateStatus({
                id,
                status: "in_progress",
              });
              toast.success("Marked as watching");
              queryClient.invalidateQueries({
                queryKey: orpc.titles.key(),
              });
              queryClient.invalidateQueries({
                queryKey: orpc.dashboard.key(),
              });
            }}
          >
            <ContextMenu.ItemIcon ios={{ name: "play.fill" }} />
            <ContextMenu.ItemTitle>Mark as Watching</ContextMenu.ItemTitle>
          </ContextMenu.Item>
        )}
        {type === "movie" && (
          <ContextMenu.Item
            key="watched"
            onSelect={async () => {
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
          >
            <ContextMenu.ItemIcon ios={{ name: "checkmark.circle" }} />
            <ContextMenu.ItemTitle>Mark as Watched</ContextMenu.ItemTitle>
          </ContextMenu.Item>
        )}
        {localStatus && (
          <ContextMenu.Item
            key="remove"
            destructive
            onSelect={async () => {
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
          >
            <ContextMenu.ItemIcon ios={{ name: "trash" }} />
            <ContextMenu.ItemTitle>Remove from Library</ContextMenu.ItemTitle>
          </ContextMenu.Item>
        )}
      </ContextMenu.Content>
    </ContextMenu.Root>
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
