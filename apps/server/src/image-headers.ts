import type { MiddlewareHandler } from "hono";

/**
 * Images and avatars are untrusted bytes (TMDB SVGs, user uploads): never let a browser run them
 * as a document. `frame-ancestors` repeats the app-wide policy from request-guards.ts, which this
 * header replaces on these routes.
 */
export const IMAGE_CONTENT_SECURITY_POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; sandbox; frame-ancestors 'self'";

/**
 * Must be registered before `secureHeaders` in index.ts: secureHeaders sets its CSP after the
 * handler runs and would otherwise overwrite this one.
 */
export const imageSecurityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.res.headers.set("Content-Security-Policy", IMAGE_CONTENT_SECURITY_POLICY);
};
