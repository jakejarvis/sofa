import { Hono } from "hono";

import { auth } from "@sofa/auth/server";

const app = new Hono();

// Better Auth >= 1.7 serves genericOAuth callbacks at the core `/callback/:id`
// endpoint. Existing IdP registrations (and `getOidcRedirectURI()`) still use
// the legacy `/oauth2/callback/:id` path, so forward it to the new endpoint.
app.all("/oauth2/callback/:providerId", (c) => {
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace("/oauth2/callback/", "/callback/");
  return auth.handler(new Request(url.toString(), c.req.raw));
});

app.all("/*", (c) => auth.handler(c.req.raw));

export default app;
