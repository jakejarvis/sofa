import { msg } from "@lingui/core/macro";
import { QueryCache, QueryClient } from "@tanstack/react-query";

import { posthog } from "@/lib/posthog";
import { getIsReachable, isNetworkError } from "@/lib/server";
import { toast } from "@/lib/toast";
import { i18n } from "@sofa/i18n";

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

      toast.error(i18n._(msg`Something went wrong\u2026`));
      posthog?.captureException(error, { source: "react-query" });
    },
  }),
});
