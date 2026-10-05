import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";

import { auth } from "@sofa/auth/server";

const MB = 1024 * 1024;

/** Ordinary API calls; avatar uploads (≤ 2 MB) fit. */
export const DEFAULT_BODY_LIMIT = 4 * MB;
/** 100 MB file inputs plus multipart overhead. */
export const UPLOAD_BODY_LIMIT = 110 * MB;

/** Procedures that accept large bodies: file uploads and import payloads. */
export const LARGE_BODY_PATHS = new Set([
  "/rpc/imports/parseFile",
  "/rpc/imports/parsePayload",
  "/rpc/imports/createJob",
  "/rpc/admin/backups/restore",
  "/api/v1/imports/parse-file",
  "/api/v1/imports/parse-payload",
  "/api/v1/imports/jobs",
  "/api/v1/admin/backups/restore",
]);

const defaultLimit = bodyLimit({ maxSize: DEFAULT_BODY_LIMIT });
const uploadLimit = bodyLimit({ maxSize: UPLOAD_BODY_LIMIT });

/**
 * Body limits for /rpc and /api/v1. oRPC reads the whole body before procedure
 * middleware (including auth) runs, so large-body routes check the session first.
 */
export const apiBodyLimit: MiddlewareHandler = async (c, next) => {
  if (!LARGE_BODY_PATHS.has(c.req.path)) return defaultLimit(c, next);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return uploadLimit(c, next);
};
