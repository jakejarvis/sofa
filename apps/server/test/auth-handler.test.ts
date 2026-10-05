import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { auth } from "@sofa/auth/server";

import { clearAuthorizationEndpointCache } from "../src/expo-proxy-guard";
import app from "../src/routes/auth";

vi.mock("@sofa/auth/server", () => ({
  auth: {
    api: {},
    handler: vi.fn<(req: Request) => Promise<Response>>(async () => new Response("ok")),
  },
}));

const handler = vi.mocked(auth.handler);

const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(
  async () =>
    Response.json({ authorization_endpoint: "https://idp.example.com/application/o/authorize/" }),
);

const ALLOWED = "https://idp.example.com/application/o/authorize/?client_id=sofa&state=abc";

const proxy = (target: string) =>
  app.request(`/expo-authorization-proxy?authorizationURL=${encodeURIComponent(target)}`);

beforeEach(() => {
  handler.mockClear();
  fetchMock.mockClear();
  clearAuthorizationEndpointCache();
  process.env.OIDC_CLIENT_ID = "sofa";
  process.env.OIDC_CLIENT_SECRET = "test-secret";
  process.env.OIDC_ISSUER_URL = "https://idp.example.com/application/o/sofa";
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  delete process.env.OIDC_CLIENT_ID;
  delete process.env.OIDC_CLIENT_SECRET;
  delete process.env.OIDC_ISSUER_URL;
  vi.unstubAllGlobals();
});

describe("expo-authorization-proxy guard", () => {
  test("rejects a foreign host", async () => {
    const res = await proxy("https://evil.example.net/application/o/authorize/?state=abc");
    expect(res.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  test("allows the exact authorization endpoint plus query", async () => {
    const res = await proxy(ALLOWED);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("rejects the same host on a different path", async () => {
    const res = await proxy(
      "https://idp.example.com/application/o/sofa/end-session/?next=https://evil.example.net",
    );
    expect(res.status).toBe(400);
  });

  test("fetches the discovery document once", async () => {
    await proxy(ALLOWED);
    await proxy(ALLOWED);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://idp.example.com/application/o/sofa/.well-known/openid-configuration",
    );
  });

  test("does not cache a discovery failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    expect((await proxy(ALLOWED)).status).toBe(400);
    expect((await proxy(ALLOWED)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("rejects everything when OIDC is not configured", async () => {
    delete process.env.OIDC_CLIENT_SECRET;
    const res = await proxy(ALLOWED);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("auth handler forwarding", () => {
  test("never trusts a client-sent IP header on its own", async () => {
    await app.request("/get-session", {
      headers: { "x-forwarded-for": "6.6.6.6", "x-sofa-client-ip": "6.6.6.6" },
    });
    expect(handler.mock.calls[0][0].headers.get("x-sofa-client-ip")).toBeNull();
  });

  test("forwards the legacy callback path to the core endpoint", async () => {
    await app.request("/oauth2/callback/oidc?code=x&state=y");
    expect(new URL(handler.mock.calls[0][0].url).pathname).toBe("/callback/oidc");
  });
});
