import { expoClient } from "@better-auth/expo/client";
import { adminClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { QUERY_CACHE_KEY, storage } from "@/lib/mmkv";
import { queryClient } from "@/lib/query-client";
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

onServerUrlChange(async () => {
  // Clear all Better Auth stored data so the old server's token
  // is never sent to the new host and stale session state doesn't
  // persist in the UI. The expo client caches session data under
  // ${storagePrefix}_session_data in addition to cookie/token keys.
  await Promise.allSettled([
    SecureStore.deleteItemAsync("sofa_cookie"),
    SecureStore.deleteItemAsync("sofa_session_token"),
    SecureStore.deleteItemAsync("sofa_session_data"),
  ]);

  authClient = buildAuthClient();
  // Clear query cache and its MMKV-persisted data so stale data from
  // old server is discarded. React hooks referencing the old client
  // will re-mount via navigation flow (server URL change → auth
  // screens → fresh mount).
  storage.remove(QUERY_CACHE_KEY);
  queryClient.clear();
});
