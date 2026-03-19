import { useLingui } from "@lingui/react/macro";
import { IconX } from "@tabler/icons-react-native";
import { Stack, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Wrapper for modal screens. Provides:
 * - Transparent header config (both platforms)
 * - iOS: native toolbar close button
 * - Android: floating close button with safe-area offset
 */
export function ModalLayout({ children }: { children: ReactNode }) {
  const { dismissAll } = useRouter();
  const { t } = useLingui();
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-background flex-1">
      <Stack.Header transparent blurEffect="none" />
      {process.env.EXPO_OS === "ios" && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={() => dismissAll()}>
            <Stack.Toolbar.Icon sf="xmark" />
            <Stack.Toolbar.Label>{t`Close`}</Stack.Toolbar.Label>
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
      <Stack.Screen.Title asChild>
        <View />
      </Stack.Screen.Title>

      {process.env.EXPO_OS !== "ios" && (
        <Pressable
          onPress={() => dismissAll()}
          accessibilityRole="button"
          accessibilityLabel={t`Close`}
          hitSlop={8}
          style={[styles.closeButton, { top: insets.top + 8 }]}
        >
          <IconX size={20} color="white" />
        </Pressable>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    right: 16,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
