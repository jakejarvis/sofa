import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./server";

/**
 * Cached session getter — deduplicated per request via React.cache().
 * Use this instead of calling auth.api.getSession() directly in server
 * components and layouts to avoid redundant session lookups within a
 * single render pass.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
