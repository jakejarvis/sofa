import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db/client";
import {
  getUserCount,
  isRegistrationOpen,
  setSetting,
} from "@/lib/services/settings";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
  advanced: {
    database: {
      generateId: () => uuid(),
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          const userCount = await getUserCount();
          if (userCount === 0) {
            return {
              data: {
                ...userData,
                role: "admin",
              },
            };
          }
          const open = await isRegistrationOpen();
          if (!open) {
            throw new APIError("FORBIDDEN", {
              message: "Registration is currently closed",
            });
          }
          return { data: userData };
        },
        after: async () => {
          const userCount = await getUserCount();
          if (userCount === 1) {
            await setSetting("registrationOpen", "false");
          }
        },
      },
    },
  },
});
