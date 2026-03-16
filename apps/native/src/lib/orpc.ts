import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { contract } from "@sofa/api/contract";

import { authClient } from "@/lib/auth-client";
import { serverFetch } from "@/lib/server-reachability";
import { getServerUrl } from "@/lib/server-url";

export const link = new RPCLink({
  url: () => `${getServerUrl()}/rpc`,
  fetch: (url, options) =>
    serverFetch(url, {
      ...options,
      credentials: process.env.EXPO_OS === "web" ? "include" : "omit",
    }),
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
