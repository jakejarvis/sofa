import { expoClient } from "@better-auth/expo/client";
import { adminClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { getServerUrl } from "@/lib/server-url";

export const authClient = createAuthClient({
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
