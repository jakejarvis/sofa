import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./server";

/**
 * Cached session getter — deduplicated per request via React.cache().
 * Use this instead of calling auth.api.getSession() directly in server
 * components, route handlers, and server actions to avoid redundant
 * session lookups within a single render pass.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") throw new Error("Forbidden");
  return session;
}
