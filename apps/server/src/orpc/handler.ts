import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { createLogger } from "@sofa/logger";

import { restoreRootFileType } from "./restore-file-type";
import { router } from "./router";

const log = createLogger("orpc");

export const handler = new RPCHandler(router, {
  routingInterceptors: [restoreRootFileType()],
  interceptors: [
    onError((error) => {
      log.error("oRPC error", error);
    }),
  ],
});
