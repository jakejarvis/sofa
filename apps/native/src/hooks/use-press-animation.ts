import { Gesture } from "react-native-gesture-handler";
import {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const SPRING_CONFIG = { damping: 15, stiffness: 300 };

/**
 * Reanimated press-to-shrink animation with a tap gesture.
 * Respects reduced motion preferences.
 */
export function usePressAnimation(scale = 0.97) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: reduceMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, scale]),
      },
    ],
  }));

  const gesture = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withSpring(1, SPRING_CONFIG));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, SPRING_CONFIG));
    });

  return { animatedStyle, gesture };
}
