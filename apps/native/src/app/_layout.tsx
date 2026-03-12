import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Uniwind, useResolveClassNames } from "uniwind";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { TitleActionSheetProvider } from "@/components/ui/title-action-sheet";
import { authClient } from "@/lib/auth-client";
import { hasStoredServerUrl } from "@/lib/server-url";
import { queryClient } from "@/utils/orpc";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function AppContent() {
  const contentStyle = useResolveClassNames("bg-background");
  const { data: session, isPending } = authClient.useSession();
  const hasServerUrl =
    !!process.env.EXPO_PUBLIC_SERVER_URL || hasStoredServerUrl();

  useEffect(() => {
    Uniwind.setTheme("dark");
  }, []);

  useEffect(() => {
    if (!isPending || !hasServerUrl) {
      SplashScreen.hideAsync();
    }
  }, [isPending, hasServerUrl]);

  return (
    <TitleActionSheetProvider>
      <StatusBar style="light" />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle,
          animation: "slide_from_right",
        }}
      >
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
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
        </Stack.Protected>
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
