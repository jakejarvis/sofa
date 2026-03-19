import { useLingui } from "@lingui/react/macro";
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
import { memo, useCallback } from "react";
import { Pressable, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { Image } from "@/components/ui/image";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { usePressAnimation } from "@/hooks/use-press-animation";
import { titleActions } from "@/lib/title-actions";

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
}

export const PosterCard = memo(function PosterCard({
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
}: PosterCardProps) {
  const { t } = useLingui();
  const primaryColor = useCSSVariable("--color-primary") as string;
  const watchlistColor = useCSSVariable("--color-status-watchlist") as string;
  const watchingColor = useCSSVariable("--color-status-watching") as string;
  const completedColor = useCSSVariable("--color-status-completed") as string;

  const statusColors: Record<TitleStatus, string> = {
    watchlist: watchlistColor,
    in_progress: watchingColor,
    completed: completedColor,
  };

  const { animatedStyle, gesture: pressGesture } = usePressAnimation();

  const handleQuickAddPress = useCallback(() => {
    if (userStatus || isAdding) return;
    onQuickAdd(id);
  }, [userStatus, isAdding, onQuickAdd, id]);

  const year = releaseDate?.slice(0, 4);
  const imageHeight = width * 1.5;

  const statusLabel =
    userStatus === "completed"
      ? "completed"
      : userStatus === "in_progress"
        ? "watching"
        : userStatus === "watchlist"
          ? "on watchlist"
          : undefined;
  const cardAccessibilityLabel = [title, type === "movie" ? "movie" : "TV show", year, statusLabel]
    .filter(Boolean)
    .join(", ");

  const cardContent = (
    <View
      className={`bg-card overflow-hidden rounded-xl border ${
        userStatus ? "border-primary/25" : "border-white/[0.06]"
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
          <View className="bg-secondary flex-1 items-center justify-center p-3">
            <Text className="font-display text-foreground/[0.44] text-center text-sm">{title}</Text>
          </View>
        )}

        {/* Status indicator */}
        {userStatus && (
          <View
            accessible={false}
            className="absolute top-2 right-2 size-[30px] items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            {userStatus === "completed" ? (
              <IconCheckbox size={16} color="white" />
            ) : userStatus === "in_progress" ? (
              <IconPlayerPlayFilled size={16} color="white" />
            ) : (
              <IconBookmarkFilled size={16} color="white" />
            )}
          </View>
        )}

        {/* Episode progress bar */}
        {episodeProgress && episodeProgress.total > 0 && episodeProgress.watched > 0 && (
          <View
            className="absolute right-0 bottom-0 left-0 h-[3px]"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <View
              className="bg-status-watching h-full"
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
          {userStatus && (
            <View
              className="size-1.5 rounded-full"
              style={{ backgroundColor: statusColors[userStatus] }}
            />
          )}
          <Text className="text-foreground flex-1 font-sans text-sm font-medium" numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center gap-1" accessible={false}>
          {type === "movie" ? (
            <ScaledIcon icon={IconMovie} size={12} color={primaryColor} />
          ) : (
            <ScaledIcon icon={IconDeviceTv} size={12} color={primaryColor} />
          )}
          {year ? <Text className="text-muted-foreground text-xs">{year}</Text> : null}
          {voteAverage != null && voteAverage > 0 && (
            <View className="ml-auto flex-row items-center gap-1">
              <ScaledIcon icon={IconStarFilled} size={10} color={primaryColor} />
              <Text className="text-primary text-xs">{voteAverage.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
  const quickAddButton = !userStatus ? (
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
        {isAdding ? <IconLoader size={16} color="white" /> : <IconPlus size={16} color="white" />}
      </View>
    </Pressable>
  ) : null;

  const titleHref = `/title/${id}` as `/title/${string}`;

  return (
    <GestureDetector gesture={pressGesture}>
      <Animated.View style={[animatedStyle, { width }]}>
        <View>
          <Link href={titleHref} asChild>
            <Link.Trigger withAppleZoom>
              <Pressable accessibilityRole="button" accessibilityLabel={cardAccessibilityLabel}>
                {cardContent}
              </Pressable>
            </Link.Trigger>
            <Link.Preview />
            <Link.Menu>
              {!userStatus && (
                <Link.MenuAction
                  title={t`Add to Watchlist`}
                  icon="bookmark"
                  onPress={handleQuickAddPress}
                />
              )}
              {userStatus !== "in_progress" && (
                <Link.MenuAction
                  title={t`Mark as Watching`}
                  icon="play.fill"
                  onPress={() => titleActions.markWatching(id)}
                />
              )}
              {type === "movie" && (
                <Link.MenuAction
                  title={t`Mark as Watched`}
                  icon="checkmark.circle"
                  onPress={() => titleActions.markMovieWatched(id, title)}
                />
              )}
              {userStatus && (
                <Link.MenuAction
                  title={t`Remove from Library`}
                  icon="trash"
                  destructive
                  onPress={() => titleActions.removeFromLibrary(id)}
                />
              )}
            </Link.Menu>
          </Link>
          {quickAddButton}
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

export function PosterCardSkeleton({ width = 140 }: { width?: number }) {
  const imageHeight = width * 1.5;
  return (
    <View
      className="bg-card overflow-hidden rounded-xl border border-white/[0.06]"
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
