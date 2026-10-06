import { COMMON_ERROR_STATUS_MAP, MalformedResponseError, ORPCError } from "@orpc/client";

export { getAppErrorCode, getAuthErrorMessage, getErrorMessage } from "@sofa/i18n/errors";

/**
 * HTTP status behind an oRPC error. oRPC v2 errors carry no `status`: well-formed errors map their
 * code through oRPC's standard table, and non-oRPC responses (a proxy's 401, or an older Sofa
 * server whose error format differs) surface as `MALFORMED_ORPC_RESPONSE` with the raw response
 * on `cause`.
 */
function getErrorStatus(error: ORPCError<string, unknown>): number | undefined {
  if (error.cause instanceof MalformedResponseError) return error.cause.response.status;
  return (COMMON_ERROR_STATUS_MAP as Record<string, number | undefined>)[error.code];
}

/** True when an oRPC call failed because the server no longer accepts the session. */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ORPCError && getErrorStatus(error) === 401;
}

/** True for 4xx oRPC errors — retrying them can't succeed. */
export function isClientError(error: unknown): boolean {
  if (!(error instanceof ORPCError)) return false;
  const status = getErrorStatus(error);
  return status !== undefined && status >= 400 && status < 500;
}
