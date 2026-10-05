import { Hono } from "hono";

import { auth } from "@sofa/auth/server";

import { withClientIp } from "../client-ip";
import { isAllowedAuthorizationURL } from "../expo-proxy-guard";

const app = new Hono();

// The Expo plugin's proxy redirects to any https URL; allow only the OIDC provider's
// authorization endpoint (upstream FIXME in @better-auth/expo routes.ts).
app.get("/expo-authorization-proxy", async (c, next) => {
  if (!(await isAllowedAuthorizationURL(c.req.query("authorizationURL")))) {
    return c.json({ error: "Invalid authorizationURL" }, 400);
  }
  await next();
});

// Better Auth >= 1.7 serves genericOAuth callbacks at the core `/callback/:id`
// endpoint. Existing IdP registrations (and `getOidcRedirectURI()`) still use
// the legacy `/oauth2/callback/:id` path, so forward it to the new endpoint.
app.all("/oauth2/callback/:providerId", (c) => {
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace("/oauth2/callback/", "/callback/");
  return auth.handler(withClientIp(c, new Request(url.toString(), c.req.raw)));
});

app.all("/*", (c) => auth.handler(withClientIp(c, c.req.raw)));

export default app;
