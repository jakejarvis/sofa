import "@/global.css";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Uniwind, useResolveClassNames } from "uniwind";

import { OfflineBanner } from "@/components/ui/offline-banner";
import { ToastProvider } from "@/components/ui/toast-provider";
import { authClient } from "@/lib/auth-client";
import { queryPersister } from "@/lib/mmkv";
import { queryClient } from "@/lib/query-client";
import { hasStoredServerUrl, onServerUrlChange } from "@/lib/server-url";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function AppContent() {
  const contentStyle = useResolveClassNames("bg-background");

  // Force re-render when server URL changes so useSession()
  // re-subscribes to the rebuilt authClient's session atom.
  const [, setUrlVersion] = useState(0);
  useEffect(() => onServerUrlChange(() => setUrlVersion((n) => n + 1)), []);

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
    <>
      <StatusBar style="light" />
      <OfflineBanner />
      <ToastProvider />
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
            dangerouslySingular
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
            dangerouslySingular
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
    </>
  );
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppContent />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </PersistQueryClientProvider>
  );
}
