import { getOidcDiscoveryURL, isOidcConfigured } from "@sofa/auth/config";

let cachedEndpoint: Promise<URL | null> | undefined;

async function fetchAuthorizationEndpoint(discoveryURL: string): Promise<URL | null> {
  try {
    const res = await fetch(discoveryURL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const doc = (await res.json()) as { authorization_endpoint?: unknown } | null;
    const value = doc?.authorization_endpoint;
    return typeof value === "string" && URL.canParse(value) ? new URL(value) : null;
  } catch {
    return null;
  }
}

/** The IdP's `authorization_endpoint`, cached after the first successful fetch. */
function getAuthorizationEndpoint(discoveryURL: string): Promise<URL | null> {
  cachedEndpoint ??= fetchAuthorizationEndpoint(discoveryURL).then((url) => {
    if (!url) cachedEndpoint = undefined; // retry on the next request
    return url;
  });
  return cachedEndpoint;
}

/** Forgets the cached endpoint (tests change OIDC env between cases). */
export function clearAuthorizationEndpointCache(): void {
  cachedEndpoint = undefined;
}

/**
 * Whether the Expo plugin's authorization proxy may redirect to `target`. Only the configured
 * OIDC provider's authorization endpoint is allowed: same origin and path as the discovery
 * document's `authorization_endpoint`; the query string (client_id, state, PKCE…) is free.
 */
export async function isAllowedAuthorizationURL(target: string | undefined): Promise<boolean> {
  const discoveryURL = getOidcDiscoveryURL();
  if (!isOidcConfigured() || !discoveryURL || !target || !URL.canParse(target)) return false;
  const endpoint = await getAuthorizationEndpoint(discoveryURL);
  if (!endpoint) return false;
  const url = new URL(target);
  return url.origin === endpoint.origin && url.pathname === endpoint.pathname;
}
