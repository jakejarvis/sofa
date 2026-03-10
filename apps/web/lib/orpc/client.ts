import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { contract } from "@sofa/api/contract";

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      // SSR — call the API server directly
      return `${process.env.INTERNAL_API_URL || "http://localhost:3001"}/rpc`;
    }
    // Client — proxied via Next.js rewrites
    return "/rpc";
  },
  fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
});

export const client: ContractRouterClient<typeof contract> =
  createORPCClient(link);
