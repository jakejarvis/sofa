import { adminClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [adminClient(), genericOAuthClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
