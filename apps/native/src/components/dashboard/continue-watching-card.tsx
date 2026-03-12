import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";

export interface ContinueWatchingItem {
  title: {
    id: string;
    title: string;
    backdropPath: string | null;
  };
  watchedEpisodes: number;
  totalEpisodes: number;
  nextEpisode?: {
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
  } | null;
}

export function ContinueWatchingCard({ item }: { item: ContinueWatchingItem }) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.97]) }],
  }));

  return (
    <Link href={`/title/${item.title.id}` as `/title/${string}`}>
      <Link.Trigger>
        <Pressable
          onPressIn={() =>
            pressed.set(withSpring(1, { damping: 15, stiffness: 300 }))
          }
          onPressOut={() =>
            pressed.set(withSpring(0, { damping: 15, stiffness: 300 }))
          }
        >
          <Animated.View
            className="mr-3 w-[200px] overflow-hidden rounded-[12px] border bg-card"
            style={[
              animatedStyle,
              {
                borderColor: "rgba(255,255,255,0.06)",
                borderCurve: "continuous",
              },
            ]}
          >
            <View className="h-28 w-[200px]">
              {item.title.backdropPath && (
                <Image
                  source={{ uri: item.title.backdropPath }}
                  className="h-full w-full"
                  contentFit="cover"
                />
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
                  S{item.nextEpisode.seasonNumber}E
                  {item.nextEpisode.episodeNumber}
                  {item.nextEpisode.name ? ` · ${item.nextEpisode.name}` : ""}
                </Text>
              )}
            </View>
          </Animated.View>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
    </Link>
  );
}
