import { IconStarFilled } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useCSSVariable } from "uniwind";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";
import { toast } from "@/lib/toast";

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
  const { navigate } = useRouter();
  const primary = useCSSVariable("--color-primary") as string;
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.98]) }],
  }));

  const resolveMutation = useMutation(
    orpc.titles.resolve.mutationOptions({
      onSuccess: ({ id }) => {
        navigate(`/title/${id}`);
      },
      onError: () => toast.error("Failed to load title"),
    }),
  );

  const handlePress = useCallback(() => {
    resolveMutation.mutate({
      tmdbId: item.tmdbId,
      type: item.type as "movie" | "tv",
    });
  }, [item.tmdbId, item.type, resolveMutation]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withSpring(1, { damping: 15, stiffness: 300 }));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, { damping: 15, stiffness: 300 }));
    })
    .onEnd(() => {
      scheduleOnRN(handlePress);
    });

  return (
    <GestureDetector gesture={tapGesture}>
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
            className="absolute h-full w-full"
            contentFit="cover"
          />
        )}
        <View
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        />
        <View className="flex-1 justify-end p-4">
          <Text className="font-display text-2xl text-white" numberOfLines={2}>
            {item.title}
          </Text>
          {item.overview ? (
            <Text className="mt-1 text-white/70 text-xs" numberOfLines={2}>
              {item.overview}
            </Text>
          ) : null}
          <View className="mt-2 flex-row items-center gap-2">
            {item.voteAverage != null && item.voteAverage > 0 && (
              <View className="flex-row items-center gap-1">
                <IconStarFilled size={12} color={primary} />
                <Text className="text-primary text-xs">
                  {item.voteAverage.toFixed(1)}
                </Text>
              </View>
            )}
            <Text className="text-white/50 text-xs">
              {item.releaseDate?.slice(0, 4)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
