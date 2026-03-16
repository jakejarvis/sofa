import { useWindowDimensions } from "react-native";

const MAX_MULTIPLIER = 1.5;

/**
 * Returns a function that scales a base pixel size proportionally
 * to the system font scale (iOS Dynamic Type / Android font size).
 * Capped at 1.5x to match the Text component's maxFontSizeMultiplier.
 *
 * At the default font scale (1.0), returned values are unchanged.
 */
export function useScaledSize() {
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, MAX_MULTIPLIER);
  return (baseSize: number) => Math.round(baseSize * scale);
}
