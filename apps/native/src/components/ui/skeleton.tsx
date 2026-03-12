import { useEffect } from "react";
import type { ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
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

export function Skeleton({
  width,
  height = 14,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const secondaryColor = useCSSVariable("--color-secondary") as string;
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
  }));

  return (
    <Animated.View
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
