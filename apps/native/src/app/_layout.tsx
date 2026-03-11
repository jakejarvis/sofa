import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Uniwind } from "uniwind";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { TitleActionSheetProvider } from "@/components/ui/title-action-sheet";
import { colors } from "@/constants/colors";
import { queryClient } from "@/utils/orpc";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function AppContent() {
  useEffect(() => {
    Uniwind.setTheme("dark");
  }, []);

  return (
    <TitleActionSheetProvider>
      <StatusBar style="light" />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="title/[id]"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerBlurEffect: "none",
            headerTintColor: "white",
            headerBackButtonDisplayMode: "minimal",
            headerTitle: "",
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="person/[id]"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerBlurEffect: "none",
            headerTintColor: "white",
            headerBackButtonDisplayMode: "minimal",
            headerTitle: "",
            animation: "slide_from_right",
          }}
        />
      </Stack>
    </TitleActionSheetProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppContent />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
