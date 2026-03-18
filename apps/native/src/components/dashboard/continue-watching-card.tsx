import { useLingui } from "@lingui/react/macro";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { usePressAnimation } from "@/hooks/use-press-animation";
import { titleActions } from "@/lib/title-actions";

export interface ContinueWatchingItem {
  title: {
    id: string;
    title: string;
    backdropPath: string | null;
    backdropThumbHash?: string | null;
  };
  watchedEpisodes: number;
  totalEpisodes: number;
  nextEpisode?: {
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
    stillPath: string | null;
    stillThumbHash?: string | null;
  } | null;
}

export function ContinueWatchingCard({ item }: { item: ContinueWatchingItem }) {
  const { t } = useLingui();
  const { animatedStyle, gesture: tapGesture } = usePressAnimation();

  const progressLabel = `${item.watchedEpisodes} of ${item.totalEpisodes} episodes`;
  const nextEpLabel = item.nextEpisode
    ? `Next: Season ${item.nextEpisode.seasonNumber} Episode ${item.nextEpisode.episodeNumber}`
    : undefined;
  const cardLabel = [item.title.title, progressLabel, nextEpLabel].filter(Boolean).join(", ");

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View className="w-[200px]" style={animatedStyle}>
        <Link href={`/title/${item.title.id}` as `/title/${string}`} asChild>
          <Link.Trigger withAppleZoom>
            <Pressable accessibilityRole="button" accessibilityLabel={cardLabel}>
              <View
                className="bg-card overflow-hidden rounded-[12px] border"
                style={{
                  borderColor: "rgba(255,255,255,0.06)",
                  borderCurve: "continuous",
                }}
              >
                <View className="h-28 w-[200px]">
                  {(item.nextEpisode?.stillPath || item.title.backdropPath) && (
                    <Image
                      source={{
                        uri: (item.nextEpisode?.stillPath ?? item.title.backdropPath) as string,
                      }}
                      thumbHash={item.nextEpisode?.stillThumbHash ?? item.title.backdropThumbHash}
                      recyclingKey={item.title.id}
                      className="h-full w-full"
                      contentFit="cover"
                    />
                  )}
                  {item.nextEpisode && (
                    <View className="absolute right-2.5 bottom-3 left-2.5">
                      <Text
                        numberOfLines={1}
                        className="font-sans text-xs font-medium text-white/80"
                      >
                        S{item.nextEpisode.seasonNumber} E{item.nextEpisode.episodeNumber}
                      </Text>
                    </View>
                  )}
                  <View
                    className="absolute right-0 bottom-0 left-0 h-[3px]"
                    style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                  >
                    <View
                      className="bg-status-watching h-full"
                      style={{
                        width: `${item.totalEpisodes > 0 ? (item.watchedEpisodes / item.totalEpisodes) * 100 : 0}%`,
                      }}
                    />
                  </View>
                </View>
                <View className="p-2.5">
                  <Text numberOfLines={1} className="text-foreground font-sans text-sm font-medium">
                    {item.title.title}
                  </Text>
                  {item.nextEpisode && (
                    <Text numberOfLines={1} className="text-muted-foreground mt-0.5 text-xs">
                      {item.nextEpisode.name}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction
              title={t`Mark as Completed`}
              icon="checkmark.circle"
              onPress={() => titleActions.markCompleted(item.title.id, item.title.title)}
            />
            <Link.MenuAction
              title={t`Remove from Library`}
              icon="trash"
              destructive
              onPress={() => titleActions.removeFromLibrary(item.title.id)}
            />
          </Link.Menu>
        </Link>
      </Animated.View>
    </GestureDetector>
  );
}
