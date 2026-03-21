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

export function appErrorMessages(
  t: (template: TemplateStringsArray, ...args: unknown[]) => string,
): Record<AppErrorCode, string> {
  return {
    TITLE_NOT_FOUND: t`Title not found`,
    PERSON_NOT_FOUND: t`Person not found`,
    INTEGRATION_NOT_FOUND: t`Integration not found`,
    BACKUP_NOT_FOUND: t`Backup not found`,
    BACKUP_DELETE_FAILED: t`Failed to delete backup`,
    BACKUP_RESTORE_FAILED: t`Restore failed`,
    JOB_NOT_FOUND: t`Job not found`,
    TMDB_NOT_CONFIGURED: t`TMDB not configured`,
    IMPORT_INVALID_FILE: t`Invalid file`,
    IMPORT_PAYLOAD_TOO_LARGE: t`Import too large`,
    IMPORT_ALREADY_RUNNING: t`Import already running`,
    IMPORT_CANNOT_CANCEL: t`Cannot cancel import`,
    REGISTRATION_CLOSED: t`Registration closed`,
    EXPORT_FAILED: t`Failed to export data`,
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
