import "@/global.css";
import { I18nProvider } from "@lingui/react";
import { ThemeProvider } from "@react-navigation/native";
import { i18n } from "@sofa/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
} from "@tanstack/react-query-persist-client";
import { Stack, useGlobalSearchParams, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  getAdvertisingId,
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { PostHogErrorBoundary, PostHogProvider } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { enableFreeze } from "react-native-screens";
import { Uniwind, useResolveClassNames } from "uniwind";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { ServerUnreachableBanner } from "@/components/ui/server-unreachable-banner";
import { useServerConnection } from "@/hooks/use-server-connection";
import { initLocale } from "@/lib/i18n";
import { applyTrackingTransparency, posthog } from "@/lib/posthog";
import { queryClient } from "@/lib/query-client";
import {
  getScopeKey,
  initialize,
  onStorageScopeChange,
  queryPersister,
} from "@/lib/server";
import { sofaTheme } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();
enableFreeze(true);
initialize();
initLocale();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

const changePasswordOptions =
  process.env.EXPO_OS === "ios"
    ? {
        headerShown: true,
        presentation: "formSheet" as const,
        sheetAllowedDetents: "fitToContents" as const,
        sheetGrabberVisible: true,
        headerLargeTitle: false,
        headerTransparent: true,
        headerBlurEffect: "none" as const,
      }
    : {
        headerShown: true,
        presentation: "modal" as const,
        headerLargeTitle: false,
        headerTransparent: false,
        headerBlurEffect: "none" as const,
      };

function AppContent() {
  const contentStyle = useResolveClassNames("bg-background");
  const { session, isPending, hasServerUrl } = useServerConnection();

  // --- App Tracking Transparency (must resolve before screen tracking) ---
  const [trackingReady, setTrackingReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await getTrackingPermissionsAsync();
      const granted =
        status === "undetermined"
          ? (await requestTrackingPermissionsAsync()).granted
          : status === "granted";

      const enabled = applyTrackingTransparency(granted);

      // Use the platform advertising ID (IDFA / AAID) as the PostHog
      // distinct ID, but only when the resolved state is actually enabled
      // (respects both ATT result and the user's settings override).
      if (enabled && posthog) {
        const advertisingId = await getAdvertisingId();
        if (advertisingId) {
          posthog.identify(advertisingId);
        }
      }

      setTrackingReady(true);
    })();
  }, []);

  // --- PostHog screen tracking (waits for ATT to resolve) ---
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    if (trackingReady && posthog && pathname) {
      posthog.screen(pathname, params);
    }
  }, [trackingReady, pathname, params]);

  useEffect(() => {
    Uniwind.setTheme("dark");
  }, []);

  // --- Safety splash timeout (belt-and-suspenders if seeding fails) ---
  useEffect(() => {
    const timer = setTimeout(() => SplashScreen.hideAsync(), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isPending || !hasServerUrl) {
      SplashScreen.hideAsync();
    }
  }, [isPending, hasServerUrl]);

  return (
    <ThemeProvider value={sofaTheme}>
      <StatusBar style="light" />
      <OfflineBanner />
      <ServerUnreachableBanner />
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
            name="change-password"
            options={changePasswordOptions}
          />
          <Stack.Screen
            name="title/[id]"
            dangerouslySingular
            options={{
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="person/[id]"
            dangerouslySingular
            options={{
              presentation: "modal",
            }}
          />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

/**
 * Always renders a single QueryClientProvider so the React tree is never torn
 * down. Cache persistence is managed imperatively: when scoped storage becomes
 * ready we restore from MMKV and subscribe to cache mutations; when the scope
 * changes (different server/user) we unsubscribe, restore from the new
 * partition, and re-subscribe.
 */
function QueryProvider({ children }: { children: React.ReactNode }) {
  const [, setScopeVersion] = useState(0);

  useEffect(() => {
    return onStorageScopeChange(() => setScopeVersion((n) => n + 1));
  }, []);

  const scopeKey = getScopeKey();

  const prevScopeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevScopeKeyRef.current;
    prevScopeKeyRef.current = scopeKey;

    // Only clear when switching away from an active scope (user switch/logout).
    // Don't clear on initial activation (null → value) — preserve data
    // from queries that started before the scope was ready.
    // queryClient.clear() calls query.destroy() which silently cancels
    // in-flight fetches without notifying observers, permanently stalling
    // any queries that were mid-flight.
    if (prev != null && prev !== scopeKey) {
      queryClient.clear();
    }

    if (!scopeKey) return;

    const options = { queryClient, persister: queryPersister };

    let unsubscribe: (() => void) | undefined;
    let aborted = false;

    persistQueryClientRestore(options).then(() => {
      if (aborted) return;
      unsubscribe = persistQueryClientSubscribe(options);
    });

    return () => {
      aborted = true;
      unsubscribe?.();
    };
  }, [scopeKey]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export default function RootLayout() {
  const inner = (
    <I18nProvider i18n={i18n}>
      <QueryProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppContent />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryProvider>
    </I18nProvider>
  );

  if (!posthog) return inner;

  return (
    <PostHogProvider client={posthog} autocapture={{ captureScreens: false }}>
      <PostHogErrorBoundary>{inner}</PostHogErrorBoundary>
    </PostHogProvider>
  );
}
