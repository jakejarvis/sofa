import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterContractClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { authClient, getServerUrl, serverFetch } from "@/lib/server";
import type { contract } from "@sofa/api/contract";

export const link = new RPCLink({
  // The server URL may carry a path prefix (reverse proxy); the link concatenates origin + url.
  origin: () => getServerUrl(),
  url: "/rpc",
  fetch: (url, options) =>
    serverFetch(url, {
      ...options,
      credentials: process.env.EXPO_OS === "web" ? "include" : "omit",
    }),
  async headers() {
    if (process.env.EXPO_OS === "web") {
      return {};
    }
    const headers = new Map<string, string>();
    const cookies = await authClient.getCookie();
    if (cookies) {
      headers.set("cookie", cookies);
    }
    return Object.fromEntries(headers);
  },
});

export const client: RouterContractClient<typeof contract> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
