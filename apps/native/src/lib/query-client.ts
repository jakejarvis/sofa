import { QueryCache, QueryClient } from "@tanstack/react-query";

import { posthog } from "@/lib/posthog";
import { getIsReachable, isNetworkError } from "@/lib/server-reachability";
import { toast } from "@/lib/toast";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: ONE_DAY_MS,
      networkMode: "online",
      retry: (failureCount, error) => {
        // Don't retry network errors when server is unreachable — the
        // banner already tells the user and retries will just spam toasts.
        if (!getIsReachable() && isNetworkError(error)) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      networkMode: "online",
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      // Suppress toasts for network errors when the server-unreachable
      // banner is already visible — avoids flooding native toasts.
      if (!getIsReachable() && isNetworkError(error)) return;

      toast.error("Something went wrong\u2026", {
        description: error.message,
      });
      posthog?.captureException(error, { source: "react-query" });
    },
  }),
});
