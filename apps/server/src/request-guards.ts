import type { Context, MiddlewareHandler } from "hono";
import type { secureHeaders } from "hono/secure-headers";

/**
 * Security headers. HSTS is left to the reverse proxy; the referrer policy must allow
 * YouTube trailer embeds; CORP/COOP are off so external dashboards and OIDC flows keep working.
 */
export const SECURITY_HEADERS_OPTIONS: NonNullable<Parameters<typeof secureHeaders>[0]> = {
  contentSecurityPolicy: { frameAncestors: ["'self'"] },
  referrerPolicy: "strict-origin-when-cross-origin",
  strictTransportSecurity: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originOf(url: string | undefined): string | null {
  if (!url || !URL.canParse(url)) return null;
  return new URL(url).origin;
}

function allowedOrigins(c: Context): Set<string> {
  const origins = new Set<string>([new URL(c.req.url).origin]);
  for (const candidate of [
    process.env.BETTER_AUTH_URL,
    process.env.CORS_ORIGIN || "http://localhost:3000",
  ]) {
    const origin = originOf(candidate);
    if (origin) origins.add(origin);
  }
  return origins;
}

/**
 * Reject state-changing requests that a browser sent from another site. Requests without
 * Origin/Sec-Fetch-Site (the native app, scripts, media servers) are allowed; their
 * authentication (cookie or token) is checked downstream.
 */
export const rejectCrossSiteRequests: MiddlewareHandler = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();
  const origin = c.req.header("origin");
  if (origin) {
    if (!allowedOrigins(c).has(origin)) return c.json({ error: "Forbidden" }, 403);
    return next();
  }
  const site = c.req.header("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return c.json({ error: "Forbidden" }, 403);
  return next();
};
