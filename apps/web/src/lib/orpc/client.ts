import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { contract } from "@sofa/api/contract";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error("Something went wrong…", {
        description: error.message,
        action: {
          label: "Retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

export const link = new RPCLink({
  url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
  fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
});

export const client: ContractRouterClient<typeof contract> =
  createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
