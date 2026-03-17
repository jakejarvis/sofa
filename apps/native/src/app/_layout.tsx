import "@/global.css";
import { ThemeProvider } from "@react-navigation/native";
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
import { Uniwind, useResolveClassNames } from "uniwind";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { ServerUnreachableBanner } from "@/components/ui/server-unreachable-banner";
import { authClient, rebuildAuthClient } from "@/lib/auth-client";
import { getCachedSession } from "@/lib/cached-session";
import {
  clearStorageScope,
  hasScopedStorage,
  onStorageScopeChange,
  queryPersister,
  setStorageScope,
} from "@/lib/mmkv";
import { applyTrackingTransparency, posthog } from "@/lib/posthog";
import { queryClient } from "@/lib/query-client";
import {
  onServerReachabilityChange,
  startReachabilityMonitor,
} from "@/lib/server-reachability";
import {
  ensureInstanceId,
  getCurrentInstanceId,
  hasStoredServerUrl,
  onServerUrlChange,
} from "@/lib/server-url";
import { sofaTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";

SplashScreen.preventAutoHideAsync();

// Seed the session atom with cached data from SecureStore before React renders.
// This allows the app to show cached data immediately when the server is
// unreachable, instead of hanging on the splash screen or dumping the user
// on the login screen. Better Auth's background fetch will still fire and
// update the atom when the server responds.
const cachedSession = getCachedSession();
if (cachedSession) {
  const sessionAtom = authClient.$store.atoms.session;
  sessionAtom.set({
    data: cachedSession,
    error: null,
    isPending: false,
    isRefetching: true,
    refetch: sessionAtom.get().refetch,
  });
}

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
        headerTransparent: false,
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

  // Force re-render when server URL changes so useSession()
  // re-subscribes to the rebuilt authClient's session atom.
  const [, setUrlVersion] = useState(0);
  useEffect(() => onServerUrlChange(() => setUrlVersion((n) => n + 1)), []);

  const { data: session, isPending } = authClient.useSession();
  const hasServerUrl =
    !!process.env.EXPO_PUBLIC_SERVER_URL || hasStoredServerUrl();

  // --- Ensure instance ID is available (handles upgrades and env-based URLs) ---
  const [instanceId, setInstanceId] = useState(getCurrentInstanceId);

  useEffect(() => {
    if (!instanceId && hasServerUrl) {
      ensureInstanceId().then((id) => {
        if (id) {
          setInstanceId(id);
          rebuildAuthClient();
        }
      });
    }
  }, [instanceId, hasServerUrl]);

  // Re-sync instanceId when server URL changes (registerServer sets it synchronously)
  useEffect(() => {
    return onServerUrlChange(() => setInstanceId(getCurrentInstanceId()));
  }, []);

  // --- Set storage scope when we have both instanceId and userId ---
  const userId = session?.user?.id;

  useEffect(() => {
    if (instanceId && userId) {
      setStorageScope(instanceId, userId);
    } else if (!userId && hasScopedStorage()) {
      clearStorageScope();
    }
  }, [instanceId, userId]);

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

  // --- Server reachability monitor ---
  useEffect(() => {
    if (!hasServerUrl) return;
    return startReachabilityMonitor();
  }, [hasServerUrl]);

  // --- Session reconciliation: re-validate when server comes back ---
  const hadOptimisticSession = useRef(!!cachedSession);
  const prevSession = useRef(session);

  useEffect(() => {
    return onServerReachabilityChange((reachable) => {
      if (reachable) {
        // Server came back — trigger session re-validation
        const atom = authClient.$store.atoms.session;
        atom.get().refetch?.();
      }
    });
  }, []);

  // If session was seeded from cache and then invalidated by the server,
  // show a toast so the user knows why they were signed out.
  useEffect(() => {
    if (prevSession.current && !session && hadOptimisticSession.current) {
      toast.info("Session expired", {
        description: "Please sign in again.",
      });
      hadOptimisticSession.current = false;
    }
    prevSession.current = session;
  }, [session]);

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
              headerShown: true,
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="person/[id]"
            dangerouslySingular
            options={{
              headerShown: true,
              animation: "slide_from_right",
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
  const { data: session } = authClient.useSession();
  const instanceId = getCurrentInstanceId();
  const scopeReady = hasScopedStorage();

  useEffect(() => {
    return onStorageScopeChange(() => setScopeVersion((n) => n + 1));
  }, []);

  const scopeKey =
    scopeReady && instanceId && session?.user?.id
      ? `${instanceId}_${session.user.id}`
      : null;

  useEffect(() => {
    if (!scopeKey) return;

    const options = { queryClient, persister: queryPersister };

    // Restore the persisted cache from the active MMKV partition, then
    // subscribe so every subsequent cache update is written back.
    // Clear the cache first so a scope change doesn't leave stale data
    // from a previous partition if the async restore races.
    queryClient.clear();

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
    <QueryProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppContent />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryProvider>
  );

  if (!posthog) return inner;

  return (
    <PostHogProvider client={posthog} autocapture={{ captureScreens: false }}>
      <PostHogErrorBoundary>{inner}</PostHogErrorBoundary>
    </PostHogProvider>
  );
}
