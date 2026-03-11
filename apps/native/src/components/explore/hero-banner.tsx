import { IconStarFilled } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { orpc } from "@/utils/orpc";

export interface HeroBannerItem {
  tmdbId: number;
  title: string;
  type: string;
  backdropPath?: string | null;
  overview?: string | null;
  voteAverage?: number | null;
  releaseDate?: string | null;
}

export function HeroBanner({ item }: { item: HeroBannerItem }) {
  const { push } = useRouter();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.98]) }],
  }));

  const resolveMutation = useMutation(
    orpc.titles.resolve.mutationOptions({
      onSuccess: ({ id }) => {
        push(`/title/${id}`);
      },
    }),
  );

  const handlePress = useCallback(() => {
    resolveMutation.mutate({
      tmdbId: item.tmdbId,
      type: item.type as "movie" | "tv",
    });
  }, [item.tmdbId, item.type, resolveMutation]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() =>
        pressed.set(withSpring(1, { damping: 15, stiffness: 300 }))
      }
      onPressOut={() =>
        pressed.set(withSpring(0, { damping: 15, stiffness: 300 }))
      }
    >
      <Animated.View
        className="mx-4 overflow-hidden rounded-2xl"
        style={[
          animatedStyle,
          {
            height: 220,
            opacity: resolveMutation.isPending ? 0.7 : 1,
            borderCurve: "continuous",
          },
        ]}
      >
        {item.backdropPath && (
          <Image
            source={{ uri: item.backdropPath }}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            contentFit="cover"
          />
        )}
        <View
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        />
        <View className="flex-1 justify-end p-4">
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 24,
              color: "white",
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.overview ? (
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.7)",
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {item.overview}
            </Text>
          ) : null}
          <View className="mt-2 flex-row items-center gap-2">
            {item.voteAverage != null && item.voteAverage > 0 && (
              <View className="flex-row items-center gap-1">
                <IconStarFilled size={12} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary }}>
                  {item.voteAverage.toFixed(1)}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              {item.releaseDate?.slice(0, 4)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}
