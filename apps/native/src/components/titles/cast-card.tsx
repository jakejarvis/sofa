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

export function CastCard({
  person,
}: {
  person: {
    id: string;
    name: string;
    character: string | null;
    profilePath: string | null;
  };
}) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.95]) }],
  }));

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withSpring(1, { damping: 15, stiffness: 300 }));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, { damping: 15, stiffness: 300 }));
    });

  return (
    <Link href={`/person/${person.id}` as `/person/${string}`}>
      <Link.Trigger>
        <GestureDetector gesture={tapGesture}>
          <Animated.View className="w-20 items-center" style={animatedStyle}>
            <View className="mb-2 h-16 w-16 overflow-hidden rounded-full bg-secondary">
              {person.profilePath && (
                <Image
                  source={{ uri: person.profilePath }}
                  className="h-full w-full"
                  contentFit="cover"
                />
              )}
            </View>
            <Text
              numberOfLines={1}
              className="text-center font-sans-medium text-[11px] text-foreground"
            >
              {person.name}
            </Text>
            {person.character ? (
              <Text
                numberOfLines={1}
                className="text-center text-[10px] text-muted-foreground"
              >
                {person.character}
              </Text>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </Link.Trigger>
      <Link.Preview />
    </Link>
  );
}
