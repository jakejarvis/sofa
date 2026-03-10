import "server-only";
import { createRouterClient } from "@orpc/server";
import { headers } from "next/headers";
import { router } from "./router";

globalThis.$orpcClient = createRouterClient(router, {
  context: async () => ({
    headers: await headers(),
  }),
});
