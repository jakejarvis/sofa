import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { admin, genericOAuth } from "better-auth/plugins";

import { claimInitialAdmin, isRegistrationOpen } from "@sofa/core/settings";
import { db } from "@sofa/db/client";
import * as schema from "@sofa/db/schema";
import { createLogger } from "@sofa/logger";

import {
  getOidcRedirectURI,
  isOidcAutoRegisterEnabled,
  isOidcConfigured,
  isPasswordLoginDisabled,
} from "./config";

const authLog = createLogger("auth");

export const auth = betterAuth({
  trustedOrigins: ["sofa://"],
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
    // `db` is created without a schema, so the adapter can't discover tables
    // via `db._.fullSchema` and must be given them explicitly.
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
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
                redirectURI: getOidcRedirectURI(),
                scopes: ["openid", "email", "profile"],
                pkce: true,
                disableImplicitSignUp: !isOidcAutoRegisterEnabled(),
                mapProfileToUser: (profile) => ({
                  name:
                    profile.name ||
                    (typeof profile.preferred_username === "string"
                      ? profile.preferred_username
                      : undefined) ||
                    profile.email ||
                    undefined,
                }),
              },
            ],
          }),
        ]
      : []),
    expo(),
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
        after: async (user) => {
          // Promote exactly one bootstrap user to admin, even if multiple
          // sign-ups race during the first-run window.
          claimInitialAdmin(user.id);
        },
      },
    },
  },
} satisfies BetterAuthOptions);

export type Session = typeof auth.$Infer.Session;
