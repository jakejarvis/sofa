import { onlineManager } from "@tanstack/react-query";
import { useCallback, useState } from "react";

/** Longest the pull-to-refresh spinner stays up; refetches keep running after it hides. */
const MAX_SPINNER_MS = 15_000;

/**
 * RefreshControl state that only reflects user-initiated refreshes (not background refetches).
 * While React Query is offline its refetches are paused and `refresh()` won't settle until the app
 * is back online, so skip the spinner then (the offline banner already explains why) and cap it
 * otherwise.
 */
export function usePullToRefresh(refresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    if (!onlineManager.isOnline()) {
      void refresh();
      return;
    }
    setRefreshing(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        refresh(),
        new Promise((resolve) => {
          timer = setTimeout(resolve, MAX_SPINNER_MS);
        }),
      ]);
    } finally {
      clearTimeout(timer);
      setRefreshing(false);
    }
  }, [refresh]);
  return { refreshing, onRefresh };
}
