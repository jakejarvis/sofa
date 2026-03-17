import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { client, orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";

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
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: reduceMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.97]),
      },
    ],
  }));

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withSpring(1, { damping: 15, stiffness: 300 }));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, { damping: 15, stiffness: 300 }));
    });

  const progressLabel = `${item.watchedEpisodes} of ${item.totalEpisodes} episodes`;
  const nextEpLabel = item.nextEpisode
    ? `Next: Season ${item.nextEpisode.seasonNumber} Episode ${item.nextEpisode.episodeNumber}`
    : undefined;
  const cardLabel = [item.title.title, progressLabel, nextEpLabel]
    .filter(Boolean)
    .join(", ");

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View className="w-[200px]" style={animatedStyle}>
        <Link href={`/title/${item.title.id}` as `/title/${string}`} asChild>
          <Link.Trigger withAppleZoom>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cardLabel}
            >
              <View
                className="overflow-hidden rounded-[12px] border bg-card"
                style={{
                  borderColor: "rgba(255,255,255,0.06)",
                  borderCurve: "continuous",
                }}
              >
                <View className="h-28 w-[200px]">
                  {(item.nextEpisode?.stillPath || item.title.backdropPath) && (
                    <Image
                      source={{
                        uri: (item.nextEpisode?.stillPath ??
                          item.title.backdropPath) as string,
                      }}
                      thumbHash={
                        item.nextEpisode?.stillThumbHash ??
                        item.title.backdropThumbHash
                      }
                      recyclingKey={item.title.id}
                      className="h-full w-full"
                      contentFit="cover"
                    />
                  )}
                  <View
                    className="absolute inset-0"
                    style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                  />
                  {item.nextEpisode && (
                    <View className="absolute right-2.5 bottom-3 left-2.5">
                      <Text
                        numberOfLines={1}
                        className="font-medium font-sans text-white/80 text-xs"
                      >
                        S{item.nextEpisode.seasonNumber} E
                        {item.nextEpisode.episodeNumber}
                      </Text>
                    </View>
                  )}
                  <View
                    className="absolute right-0 bottom-0 left-0 h-[3px]"
                    style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                  >
                    <View
                      className="h-full bg-status-watching"
                      style={{
                        width: `${item.totalEpisodes > 0 ? (item.watchedEpisodes / item.totalEpisodes) * 100 : 0}%`,
                      }}
                    />
                  </View>
                </View>
                <View className="p-2.5">
                  <Text
                    numberOfLines={1}
                    className="font-medium font-sans text-foreground text-sm"
                  >
                    {item.title.title}
                  </Text>
                  {item.nextEpisode && (
                    <Text
                      numberOfLines={1}
                      className="mt-0.5 text-muted-foreground text-xs"
                    >
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
              title="Mark as Completed"
              icon="checkmark.circle"
              onPress={async () => {
                await client.titles.updateStatus({
                  id: item.title.id,
                  status: "completed",
                });
                toast.success(`Marked "${item.title.title}" as completed`);
                queryClient.invalidateQueries({
                  queryKey: orpc.titles.key(),
                });
                queryClient.invalidateQueries({
                  queryKey: orpc.dashboard.key(),
                });
              }}
            />
            <Link.MenuAction
              title="Remove from Library"
              icon="trash"
              destructive
              onPress={async () => {
                await client.titles.updateStatus({
                  id: item.title.id,
                  status: null,
                });
                toast.success("Removed from library");
                queryClient.invalidateQueries({
                  queryKey: orpc.titles.key(),
                });
                queryClient.invalidateQueries({
                  queryKey: orpc.dashboard.key(),
                });
              }}
            />
          </Link.Menu>
        </Link>
      </Animated.View>
    </GestureDetector>
  );
}
