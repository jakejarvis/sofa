import { msg } from "@lingui/core/macro";
import * as Sentry from "@sentry/react-native";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { isClientError, isUnauthorizedError } from "@/lib/error-messages";
import { posthog } from "@/lib/posthog";
import { QUERY_GC_TIME } from "@/lib/query-config";
import { authClient, getIsReachable, isNetworkError } from "@/lib/server";
import { toast } from "@/lib/toast";
import { i18n } from "@sofa/i18n";

// The server rejected the session: re-validate it (at most once per 5s) so the
// session-loss redirect runs instead of every screen erroring until foreground.
let lastSessionCheck = 0;
function handleUnauthorized() {
  const now = Date.now();
  if (now - lastSessionCheck < 5_000) return;
  lastSessionCheck = now;
  authClient.$store.atoms.session.get().refetch?.();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: QUERY_GC_TIME,
      networkMode: "online",
      retry: (failureCount, error) => {
        // 4xx errors can't succeed on retry.
        if (isClientError(error)) return false;
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
      // Keep the 401 branch first: an expired session is an expected state,
      // not worth a toast or an error report.
      if (isUnauthorizedError(error)) {
        handleUnauthorized();
        return;
      }

      // Suppress toasts for network errors when the server-unreachable
      // banner is already visible — avoids flooding native toasts.
      if (!getIsReachable() && isNetworkError(error)) return;

      toast.error(i18n._(msg`Something went wrong\u2026`));
      posthog?.captureException(error, { source: "react-query" });
      Sentry.captureException(error, { tags: { source: "react-query" } });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Mutations already toast their own failures; only re-validate the session.
      if (isUnauthorizedError(error)) handleUnauthorized();
    },
  }),
});
