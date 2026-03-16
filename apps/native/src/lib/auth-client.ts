import { expoClient } from "@better-auth/expo/client";
import { adminClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { queryClient } from "@/lib/query-client";
import { serverFetch } from "@/lib/server-reachability";
import {
  getCurrentInstanceId,
  getServerUrl,
  onServerUrlChange,
} from "@/lib/server-url";

function getStoragePrefix(): string {
  const instanceId = getCurrentInstanceId();
  if (instanceId) {
    return `sofa_${instanceId}`;
  }
  return "sofa";
}

function buildAuthClient() {
  return createAuthClient({
    baseURL: getServerUrl(),
    fetchOptions: {
      customFetchImpl: serverFetch,
    },
    plugins: [
      adminClient(),
      genericOAuthClient(),
      expoClient({
        scheme: "sofa",
        storagePrefix: getStoragePrefix(),
        storage: SecureStore,
      }),
    ],
  });
}

export let authClient = buildAuthClient();

/** Rebuild the auth client (e.g. when the instance ID becomes available). */
export function rebuildAuthClient() {
  authClient = buildAuthClient();
}

onServerUrlChange(() => {
  authClient = buildAuthClient();
  queryClient.clear();
});
