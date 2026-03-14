import { Pressable } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 20;
const THUMB_SIZE = 14;
const THUMB_OFFSET = 3;

export function Switch({
  value,
  onValueChange,
  disabled,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const primaryColor = useCSSVariable("--color-primary") as string;
  const secondaryColor = useCSSVariable("--color-secondary") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;

  const progress = useDerivedValue(() =>
    withTiming(value ? 1 : 0, { duration: 200 }),
  );

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.get(),
      [0, 1],
      [secondaryColor, primaryColor],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          THUMB_OFFSET +
          progress.get() * (TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET * 2),
      },
    ],
    backgroundColor: interpolateColor(
      progress.get(),
      [0, 1],
      [mutedFgColor, "#fff"],
    ),
  }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      <Animated.View
        style={[
          {
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              position: "absolute",
              top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
