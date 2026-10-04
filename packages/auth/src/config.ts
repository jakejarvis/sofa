/**
 * Server-side configuration checks.
 * Call these in route handlers or server components — never on the client.
 */

export function isOidcConfigured(): boolean {
  return !!(
    process.env.OIDC_CLIENT_ID &&
    process.env.OIDC_CLIENT_SECRET &&
    process.env.OIDC_ISSUER_URL
  );
}

export function getOidcProviderName(): string {
  return process.env.OIDC_PROVIDER_NAME || "SSO";
}

export function isOidcAutoRegisterEnabled(): boolean {
  return process.env.OIDC_AUTO_REGISTER !== "false";
}

export function isPasswordLoginDisabled(): boolean {
  return process.env.DISABLE_PASSWORD_LOGIN === "true" && isOidcConfigured();
}

/**
 * OIDC redirect URI, pinned to the `/oauth2/callback/oidc` path that Better
 * Auth's genericOAuth plugin used before v1.7 so existing IdP registrations
 * keep working. v1.7 handles the callback at the core `/callback/oidc`
 * endpoint instead; apps/server forwards the legacy path there.
 *
 * Mirrors Better Auth's own base URL resolution: `BETTER_AUTH_URL` is used
 * as-is when it already has a path, otherwise `/api/auth` is appended.
 * Returns `undefined` (Better Auth's default) when the env var isn't set.
 */
export function getOidcRedirectURI(): string | undefined {
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) return undefined;
  const trimmed = baseURL.replace(/\/+$/, "");
  const authBaseURL = new URL(trimmed).pathname === "/" ? `${trimmed}/api/auth` : trimmed;
  return `${authBaseURL}/oauth2/callback/oidc`;
}
