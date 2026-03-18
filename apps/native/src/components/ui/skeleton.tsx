import { useEffect } from "react";
import type { ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height = 14, borderRadius = 4, style }: SkeletonProps) {
  const secondaryColor = useCSSVariable("--color-secondary") as string;
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 0.7 : 0.4);

  useEffect(() => {
    if (!reduceMotion) {
      opacity.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
    }
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel="Loading"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: secondaryColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
