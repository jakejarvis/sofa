import { msg } from "@lingui/core/macro";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterContractClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { contract } from "@sofa/api/contract";
import { i18n } from "@sofa/i18n";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (_error, query) => {
      toast.error(i18n._(msg`Something went wrong…`), {
        action: {
          label: i18n._(msg`Retry`),
          onClick: () => void queryClient.refetchQueries({ queryKey: query.queryKey, exact: true }),
        },
      });
    },
  }),
});

export const link = new RPCLink({
  // No `origin`: in the browser the link uses the current origin.
  url: "/rpc",
  fetch: (url, init) => fetch(url, { ...init, credentials: "include" }),
});

export const client: RouterContractClient<typeof contract> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
