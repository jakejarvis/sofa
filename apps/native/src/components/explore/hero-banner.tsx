import { IconStarFilled } from "@tabler/icons-react-native";
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
import { useCSSVariable } from "uniwind";
import { Image } from "@/components/ui/image";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { client, orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";

export interface HeroBannerItem {
  id: string;
  title: string;
  type: string;
  backdropPath?: string | null;
  overview?: string | null;
  voteAverage?: number | null;
  releaseDate?: string | null;
}

export function HeroBanner({ item }: { item: HeroBannerItem }) {
  const primary = useCSSVariable("--color-primary") as string;
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: reduceMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.98]),
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

  const accessibilityLabel = [
    item.title,
    item.releaseDate?.slice(0, 4),
    item.voteAverage ? `${item.voteAverage.toFixed(1)} stars` : undefined,
  ]
    .filter(Boolean)
    .join(", ");
  const titleHref = `/title/${item.id}` as `/title/${string}`;

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        className="mx-4 overflow-hidden rounded-2xl"
        style={[
          animatedStyle,
          {
            height: 220,
            borderCurve: "continuous",
          },
        ]}
      >
        <Link href={titleHref} asChild>
          <Link.Trigger>
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              accessibilityHint="Opens title details"
              style={{ flex: 1 }}
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
                <Text
                  className="font-display text-2xl text-white"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                {item.overview ? (
                  <Text
                    className="mt-1 text-white/70 text-xs"
                    numberOfLines={2}
                  >
                    {item.overview}
                  </Text>
                ) : null}
                <View className="mt-2 flex-row items-center gap-2">
                  {item.voteAverage != null && item.voteAverage > 0 && (
                    <View className="flex-row items-center gap-1">
                      <ScaledIcon
                        icon={IconStarFilled}
                        size={12}
                        color={primary}
                      />
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
            </Pressable>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction
              title="Add to Watchlist"
              icon="bookmark"
              onPress={async () => {
                await client.titles.quickAdd({ id: item.id });
                toast.success(`Added "${item.title}" to watchlist`);
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
