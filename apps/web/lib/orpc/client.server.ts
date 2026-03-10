import "server-only";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { contract } from "@sofa/api/contract";
import { headers } from "next/headers";

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || "http://localhost:3001";

/**
 * Server-side oRPC client that forwards cookies from the incoming request.
 * Use this in server components that need authenticated API calls.
 */
const link = new RPCLink({
  url: `${INTERNAL_API_URL}/rpc`,
  headers: async () => {
    const h = await headers();
    const cookie = h.get("cookie");
    return cookie ? { cookie } : {};
  },
});

export const serverClient: ContractRouterClient<typeof contract> =
  createORPCClient(link);
