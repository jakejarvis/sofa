import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { contract } from "@sofa/api/contract";
import { QueryCache, QueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";
import { toast } from "@/utils/toast";

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
    },
  }),
});

export const link = new RPCLink({
  url: () => `${getServerUrl()}/rpc`,
  fetch: (url, options) => {
    return fetch(url, {
      ...options,
      credentials: process.env.EXPO_OS === "web" ? "include" : "omit",
    });
  },
  headers() {
    if (process.env.EXPO_OS === "web") {
      return {};
    }
    const headers = new Map<string, string>();
    const cookies = authClient.getCookie();
    if (cookies) {
      headers.set("Cookie", cookies);
    }
    return Object.fromEntries(headers);
  },
});

export const client: ContractRouterClient<typeof contract> =
  createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
