import { QueryCache, QueryClient } from "@tanstack/react-query";

import { posthog } from "@/lib/posthog";
import { toast } from "@/lib/toast";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: ONE_DAY_MS,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error("Something went wrong\u2026", {
        description: error.message,
      });
      posthog.captureException(error, { source: "react-query" });
    },
  }),
});
