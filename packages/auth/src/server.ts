import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
  getUserCount,
  isRegistrationOpen,
  setSetting,
} from "@sofa/core/settings";
import { db } from "@sofa/db/client";
import { createLogger } from "@sofa/logger";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { admin, genericOAuth } from "better-auth/plugins";
import {
  isOidcAutoRegisterEnabled,
  isOidcConfigured,
  isPasswordLoginDisabled,
} from "./config";

const authLog = createLogger("auth");

export const auth = betterAuth({
  logger: {
    // Suppress unset secret/low entropy warnings during build
    disabled: process.env.NEXT_PHASE === "phase-production-build",
    level: "debug",
    log: (level, message, ...args) => {
      const fn = authLog[level as keyof typeof authLog];
      if (fn) fn(message, ...args);
    },
  },
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
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "jwt",
    },
  },
  plugins: [
    admin(),
    ...(isOidcConfigured()
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
                  name:
                    profile.name || profile.preferred_username || profile.email,
                }),
              },
            ],
          }),
        ]
      : []),
    // NOTE: nextCookies() removed — Better Auth works with standard
    // Request/Response natively on Hono. The web app proxies auth
    // requests to the API server.
  ],
  advanced: {
    database: {
      generateId: () => Bun.randomUUIDv7(),
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Block email/password sign-up when registration is closed.
      // This is endpoint-level so it doesn't affect OIDC user creation
      // (which is gated by the genericOAuth plugin's disableImplicitSignUp).
      if (ctx.path === "/sign-up/email") {
        const open = isRegistrationOpen();
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
        before: async (user) => {
          // First user becomes admin regardless of auth method
          const userCount = getUserCount();
          if (userCount === 0) {
            return {
              data: {
                ...user,
                role: "admin",
              },
            };
          }
          return { data: user };
        },
        after: async () => {
          // Auto-close registration after first user
          const userCount = getUserCount();
          if (userCount === 1) {
            setSetting("registrationOpen", "false");
          }
        },
      },
    },
  },
} satisfies BetterAuthOptions);

export type Session = typeof auth.$Infer.Session;
