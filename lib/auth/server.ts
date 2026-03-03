import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin, genericOAuth } from "better-auth/plugins";
import { v4 as uuid } from "uuid";
import {
  isOidcAutoRegisterEnabled,
  isOidcConfigured,
  isPasswordLoginDisabled,
} from "@/lib/config";
import { db } from "@/lib/db/client";
import {
  getUserCount,
  isRegistrationOpen,
  setSetting,
} from "@/lib/services/settings";

const oidcPlugin = isOidcConfigured()
  ? [
      genericOAuth({
        config: [
          {
            providerId: "oidc",
            clientId: process.env.OIDC_CLIENT_ID ?? "",
            clientSecret: process.env.OIDC_CLIENT_SECRET ?? "",
            discoveryUrl: `${process.env.OIDC_ISSUER_URL}/.well-known/openid-configuration`,
            scopes: ["openid", "email", "profile"],
            pkce: true,
            disableImplicitSignUp: !isOidcAutoRegisterEnabled(),
            mapProfileToUser: (profile) => ({
              name: profile.name || profile.preferred_username || profile.email,
            }),
          },
        ],
      }),
    ]
  : [];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: !isPasswordLoginDisabled(),
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["oidc"],
    },
  },
  plugins: [admin(), ...oidcPlugin],
  advanced: {
    database: {
      generateId: () => uuid(),
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Block email/password sign-up when registration is closed.
      // This is endpoint-level so it doesn't affect OIDC user creation
      // (which is gated by the genericOAuth plugin's disableImplicitSignUp).
      if (ctx.path === "/sign-up/email") {
        const open = await isRegistrationOpen();
        if (!open) {
          throw new APIError("FORBIDDEN", {
            message: "Registration is currently closed",
          });
        }
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          // First user becomes admin regardless of auth method
          const userCount = await getUserCount();
          if (userCount === 0) {
            return {
              data: {
                ...userData,
                role: "admin",
              },
            };
          }
          return { data: userData };
        },
        after: async () => {
          // Auto-close registration after first user
          const userCount = await getUserCount();
          if (userCount === 1) {
            await setSetting("registrationOpen", "false");
          }
        },
      },
    },
  },
});
