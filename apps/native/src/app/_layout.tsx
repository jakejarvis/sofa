import "@/global.css";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, useGlobalSearchParams, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  getAdvertisingId,
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { PostHogErrorBoundary, PostHogProvider } from "posthog-react-native";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Uniwind, useResolveClassNames } from "uniwind";

import { OfflineBanner } from "@/components/ui/offline-banner";
import { ToastProvider } from "@/components/ui/toast-provider";
import { authClient } from "@/lib/auth-client";
import { queryPersister } from "@/lib/mmkv";
import { applyTrackingTransparency, posthog } from "@/lib/posthog";
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

  // --- PostHog screen tracking ---
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    if (posthog && pathname) {
      posthog.screen(pathname, params);
    }
  }, [pathname, params]);

  // --- App Tracking Transparency ---
  useEffect(() => {
    (async () => {
      const { status } = await getTrackingPermissionsAsync();
      const granted =
        status === "undetermined"
          ? (await requestTrackingPermissionsAsync()).granted
          : status === "granted";

      applyTrackingTransparency(granted);

      // Use the platform advertising ID (IDFA / AAID) as the PostHog
      // distinct ID so events are tied to the device ad identifier.
      if (granted && posthog) {
        const advertisingId = await getAdvertisingId();
        if (advertisingId) {
          posthog.identify(advertisingId);
        }
      }
    })();
  }, []);

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
  const inner = (
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

  if (!posthog) return inner;

  return (
    <PostHogProvider client={posthog} autocapture={{ captureScreens: false }}>
      <PostHogErrorBoundary>{inner}</PostHogErrorBoundary>
    </PostHogProvider>
  );
}
