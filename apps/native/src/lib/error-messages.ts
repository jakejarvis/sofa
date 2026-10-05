import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { ORPCError } from "@orpc/client";

import type { AppErrorCode } from "@sofa/api/errors";
import { i18n } from "@sofa/i18n";

export function getAppErrorCode(error: unknown): AppErrorCode | null {
  if (
    error instanceof ORPCError &&
    error.data &&
    typeof error.data === "object" &&
    "code" in error.data &&
    typeof error.data.code === "string"
  ) {
    return error.data.code as AppErrorCode;
  }
  return null;
}

const APP_ERROR_MESSAGES: Record<AppErrorCode, MessageDescriptor> = {
  TITLE_NOT_FOUND: msg`Title not found`,
  PERSON_NOT_FOUND: msg`Person not found`,
  INTEGRATION_NOT_FOUND: msg`Integration not found`,
  BACKUP_NOT_FOUND: msg`Backup not found`,
  BACKUP_DELETE_FAILED: msg`Failed to delete backup`,
  BACKUP_RESTORE_FAILED: msg`Backup restoration failed`,
  JOB_NOT_FOUND: msg`Job not found`,
  TMDB_NOT_CONFIGURED: msg`TMDB API key is not configured`,
  IMPORT_INVALID_FILE: msg`Invalid import file`,
  IMPORT_PAYLOAD_TOO_LARGE: msg`Import payload is too large`,
  IMPORT_ALREADY_RUNNING: msg`An import is already in progress`,
  IMPORT_CANNOT_CANCEL: msg`This import cannot be cancelled`,
  REGISTRATION_CLOSED: msg`Registration is currently closed`,
  EXPORT_FAILED: msg`Failed to export data`,
};

/** True when an oRPC call failed because the server no longer accepts the session. */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ORPCError && (error.code === "UNAUTHORIZED" || error.status === 401);
}

/** True for 4xx oRPC errors — retrying them can't succeed. */
export function isClientError(error: unknown): boolean {
  return error instanceof ORPCError && error.status >= 400 && error.status < 500;
}

/** Localized message for an oRPC error carrying an app error code, else `fallback`. */
export function getErrorMessage(error: unknown, fallback?: string): string {
  const code = getAppErrorCode(error);
  if (code && code in APP_ERROR_MESSAGES) return i18n._(APP_ERROR_MESSAGES[code]);
  return fallback ?? i18n._(msg`Something went wrong`);
}

const AUTH_ERROR_MESSAGES: Record<string, MessageDescriptor> = {
  INVALID_EMAIL_OR_PASSWORD: msg`Invalid email or password`,
  USER_ALREADY_EXISTS: msg`An account with this email already exists`,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: msg`An account with this email already exists`,
  PASSWORD_TOO_SHORT: msg`Password is too short`,
  PASSWORD_TOO_LONG: msg`Password is too long`,
  INVALID_EMAIL: msg`Enter a valid email address`,
  REGISTRATION_CLOSED: msg`Registration is currently closed`,
};

/** Localized message for a Better Auth client error (never its raw `message`). */
export function getAuthErrorMessage(
  error: { code?: string; status?: number } | null | undefined,
  fallback: string,
): string {
  if (error?.status === 429) return i18n._(msg`Too many attempts. Wait a moment and try again.`);
  const descriptor = error?.code ? AUTH_ERROR_MESSAGES[error.code] : undefined;
  return descriptor ? i18n._(descriptor) : fallback;
}
