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

onServerUrlChange(() => {
  // Fire-and-forget SecureStore cleanup — must not block the
  // synchronous rebuild so that subsequent listeners (e.g. the root
  // layout re-render) see the new authClient immediately.
  Promise.allSettled([
    SecureStore.deleteItemAsync("sofa_cookie"),
    SecureStore.deleteItemAsync("sofa_session_token"),
    SecureStore.deleteItemAsync("sofa_session_data"),
  ]);

  authClient = buildAuthClient();
  storage.remove(QUERY_CACHE_KEY);
  queryClient.clear();
});
