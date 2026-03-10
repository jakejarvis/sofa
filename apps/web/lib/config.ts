/**
 * Server-side configuration checks.
 * Call these in route handlers or server components — never on the client.
 */

export function isTmdbConfigured(): boolean {
  return !!process.env.TMDB_API_READ_ACCESS_TOKEN;
}

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
