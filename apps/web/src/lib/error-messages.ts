import { ORPCError } from "@orpc/client";

import type { AppErrorCode } from "@sofa/api/errors";

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

// Must be called inside a render/hook body with the `t` from useLingui()
export function appErrorMessages(
  t: (template: TemplateStringsArray, ...args: unknown[]) => string,
): Record<AppErrorCode, string> {
  return {
    TITLE_NOT_FOUND: t`Title not found`,
    PERSON_NOT_FOUND: t`Person not found`,
    INTEGRATION_NOT_FOUND: t`Integration not found`,
    BACKUP_NOT_FOUND: t`Backup not found`,
    BACKUP_DELETE_FAILED: t`Failed to delete backup`,
    BACKUP_RESTORE_FAILED: t`Backup restoration failed`,
    JOB_NOT_FOUND: t`Job not found`,
    TMDB_NOT_CONFIGURED: t`TMDB API key is not configured`,
    IMPORT_INVALID_FILE: t`Invalid import file`,
    IMPORT_PAYLOAD_TOO_LARGE: t`Import payload is too large`,
    IMPORT_ALREADY_RUNNING: t`An import is already in progress`,
    IMPORT_CANNOT_CANCEL: t`This import cannot be cancelled`,
    REGISTRATION_CLOSED: t`Registration is currently closed`,
  };
}

export function getErrorMessage(
  error: unknown,
  t: (template: TemplateStringsArray, ...args: unknown[]) => string,
  fallback?: string,
): string {
  const code = getAppErrorCode(error);
  if (code) {
    const messages = appErrorMessages(t);
    if (code in messages) return messages[code as keyof typeof messages];
  }
  return fallback ?? t`Something went wrong`;
}
