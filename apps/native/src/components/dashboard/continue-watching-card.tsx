import { Link } from "expo-router";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";

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
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.97]) }],
  }));

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withSpring(1, { damping: 15, stiffness: 300 }));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, { damping: 15, stiffness: 300 }));
    });

  return (
    <Link href={`/title/${item.title.id}` as `/title/${string}`}>
      <Link.Trigger>
        <GestureDetector gesture={tapGesture}>
          <Animated.View
            className="w-[200px] overflow-hidden rounded-[12px] border bg-card"
            style={[
              animatedStyle,
              {
                borderColor: "rgba(255,255,255,0.06)",
                borderCurve: "continuous",
              },
            ]}
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
                    className="font-sans-medium text-[11px] text-white/60"
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
                className="font-sans-medium text-[13px] text-foreground"
              >
                {item.title.title}
              </Text>
              {item.nextEpisode && (
                <Text
                  numberOfLines={1}
                  className="mt-0.5 text-[11px] text-muted-foreground"
                >
                  {item.nextEpisode.name}
                </Text>
              )}
            </View>
          </Animated.View>
        </GestureDetector>
      </Link.Trigger>
      <Link.Preview />
    </Link>
  );
}
