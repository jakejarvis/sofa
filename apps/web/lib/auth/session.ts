import { headers } from "next/headers";
import { cache } from "react";

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || "http://localhost:3001";

/**
 * Cached session getter — deduplicated per request via React.cache().
 * Forwards the cookie header to the API server's get-session endpoint.
 */
export const getSession = cache(async () => {
  const headersList = await headers();
  const cookie = headersList.get("cookie") ?? "";

  const res = await fetch(`${INTERNAL_API_URL}/api/auth/get-session`, {
    headers: { cookie },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.session ? data : null;
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
