import { msg } from "@lingui/core/macro";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { contract } from "@sofa/api/contract";
import { i18n } from "@sofa/i18n";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (_error, query) => {
      toast.error(i18n._(msg`Something went wrong…`), {
        action: {
          label: i18n._(msg`Retry`),
          onClick: () => query.invalidate(),
        },
      });
    },
  }),
});

export const link = new RPCLink({
  url: `${window.location.origin}/rpc`,
  fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
});

export const client: ContractRouterClient<typeof contract> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
