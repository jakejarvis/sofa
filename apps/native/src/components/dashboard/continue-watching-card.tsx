import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

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
            style={[
              animatedStyle,
              {
                width: 200,
                marginRight: 12,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
                borderRadius: 12,
                borderCurve: "continuous",
                overflow: "hidden",
              },
            ]}
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
                    width: `${item.totalEpisodes > 0 ? (item.watchedEpisodes / item.totalEpisodes) * 100 : 0}%`,
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
