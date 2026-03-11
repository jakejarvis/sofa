import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { contract } from "@sofa/api/contract";
import { QueryCache, QueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error("[QueryCache]", error.message);
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
