import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { contract } from "@sofa/api/contract";

declare global {
  var $orpcClient: ContractRouterClient<typeof contract> | undefined;
}

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("RPCLink is not allowed on the server side.");
    }
    return `${window.location.origin}/rpc`;
  },
});

export const client: ContractRouterClient<typeof contract> =
  globalThis.$orpcClient ?? createORPCClient(link);
