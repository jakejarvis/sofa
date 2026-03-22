import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { refreshWidgets } from "@/lib/widgets";

const THROTTLE_MS = 60_000; // Don't refresh more than once per minute on foreground

export function useWidgetRefresh(isReady: boolean) {
  const lastRefresh = useRef(0);

  // Refresh when auth/server becomes ready (handles cold launch and login)
  useEffect(() => {
    if (Platform.OS !== "ios" || !isReady) return;

    void refreshWidgets();
    lastRefresh.current = Date.now();
  }, [isReady]);

  // Refresh on app foreground
  useEffect(() => {
    if (Platform.OS !== "ios") return;

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
  }, []);
}
