import { ORPCError } from "@orpc/client";

export * from "@sofa/i18n/errors";

/** True when an oRPC call failed because the server no longer accepts the session. */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ORPCError && (error.code === "UNAUTHORIZED" || error.status === 401);
}

/** True for 4xx oRPC errors — retrying them can't succeed. */
export function isClientError(error: unknown): boolean {
  return error instanceof ORPCError && error.status >= 400 && error.status < 500;
}
