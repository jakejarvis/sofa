import type { ReactNode } from "react";
import { Pressable, type PressableProps, View } from "react-native";

type MenuTriggerProps = Pick<
  PressableProps,
  | "onPress"
  | "hitSlop"
  | "accessibilityLabel"
  | "accessibilityHint"
  | "accessibilityRole"
  | "className"
> & {
  children: ReactNode;
};

/**
 * Child for `MenuView`. On Android, MenuView opens from its own wrapping Pressable, so the
 * trigger must not be touchable (an inner Pressable would swallow the tap). On iOS the SwiftUI
 * Menu handles the tap natively, so keep a Pressable for press feedback.
 */
export function MenuTrigger({ children, onPress, hitSlop, ...a11y }: MenuTriggerProps) {
  if (process.env.EXPO_OS === "android") {
    return (
      <View accessible {...a11y} accessibilityRole={a11y.accessibilityRole ?? "button"}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      {...a11y}
      accessibilityRole={a11y.accessibilityRole ?? "button"}
    >
      {children}
    </Pressable>
  );
}
