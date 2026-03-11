import { expoClient } from "@better-auth/expo/client";
import { adminClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { getServerUrl, onServerUrlChange } from "@/lib/server-url";

function buildAuthClient() {
  return createAuthClient({
    baseURL: getServerUrl(),
    plugins: [
      adminClient(),
      genericOAuthClient(),
      expoClient({
        scheme: "sofa",
        storagePrefix: "sofa",
        storage: SecureStore,
      }),
    ],
  });
}

export let authClient = buildAuthClient();

onServerUrlChange(() => {
  authClient = buildAuthClient();
  // Clear query cache so stale data from old server is discarded.
  // React hooks referencing the old client will re-mount via navigation
  // flow (server URL change → auth screens → fresh mount).
  const { queryClient } = require("@/utils/orpc");
  queryClient.clear();
});
