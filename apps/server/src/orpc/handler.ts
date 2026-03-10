import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createLogger } from "@sofa/db/logger";
import { router } from "./router";

const log = createLogger("orpc");

export const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      log.error("oRPC error", { error });
    }),
  ],
});
