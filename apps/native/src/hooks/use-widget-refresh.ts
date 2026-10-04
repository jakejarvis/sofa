import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { refreshWidgets, resetWidgets } from "@/lib/widgets";

const THROTTLE_MS = 60_000; // Don't refresh more than once per minute on foreground

export function useWidgetRefresh(isReady: boolean) {
  const lastRefresh = useRef(0);
  const hadSession = useRef(false);

  // Refresh when auth/server becomes ready (handles cold launch and login);
  // reset widgets when the session goes away (sign-out, server switch).
  useEffect(() => {
    if (Platform.OS !== "ios") return;

    if (isReady) {
      hadSession.current = true;
      void refreshWidgets();
      lastRefresh.current = Date.now();
    } else if (hadSession.current) {
      // Only reset after a session was seen: on cold launch the session may
      // still be loading, and resetting then would blank widgets every launch.
      hadSession.current = false;
      void resetWidgets();
    }
  }, [isReady]);

  // Refresh on app foreground (only while signed in)
  useEffect(() => {
    if (Platform.OS !== "ios" || !isReady) return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const now = Date.now();
        if (now - lastRefresh.current > THROTTLE_MS) {
          void refreshWidgets();
          lastRefresh.current = now;
        }
      }
    });

    return () => subscription.remove();
  }, [isReady]);
}
