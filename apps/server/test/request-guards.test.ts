import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { rejectCrossSiteRequests, SECURITY_HEADERS_OPTIONS } from "../src/request-guards";

describe("rejectCrossSiteRequests", () => {
  const original = {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
  };
  const app = new Hono();
  app.use("/rpc/*", rejectCrossSiteRequests);
  app.all("/rpc/*", (c) => c.text("ok"));

  const post = (headers: Record<string, string>) =>
    app.request("http://localhost/rpc/x", { method: "POST", headers });

  beforeEach(() => {
    process.env.BETTER_AUTH_URL = "https://sofa.example.com";
    delete process.env.CORS_ORIGIN;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test("rejects a POST from a foreign Origin", async () => {
    const res = await post({ origin: "https://evil.example.net", "content-type": "text/plain" });
    expect(res.status).toBe(403);
  });

  test("allows the BETTER_AUTH_URL origin", async () => {
    expect((await post({ origin: "https://sofa.example.com" })).status).toBe(200);
  });

  test("allows the request's own origin", async () => {
    expect((await post({ origin: "http://localhost" })).status).toBe(200);
  });

  test("rejects a cross-site POST without Origin", async () => {
    expect((await post({ "sec-fetch-site": "cross-site" })).status).toBe(403);
  });

  test("allows a POST with neither Origin nor Sec-Fetch-Site", async () => {
    expect((await post({})).status).toBe(200);
  });

  test("allows safe methods from any Origin", async () => {
    const res = await app.request("http://localhost/rpc/x", {
      headers: { origin: "https://evil.example.net" },
    });
    expect(res.status).toBe(200);
  });

  test("allows the CORS_ORIGIN origin", async () => {
    process.env.CORS_ORIGIN = "https://web.example.com";
    expect((await post({ origin: "https://web.example.com" })).status).toBe(200);
  });
});

describe("security headers", () => {
  test("sets the expected headers", async () => {
    const app = new Hono();
    app.use("*", secureHeaders(SECURITY_HEADERS_OPTIONS));
    app.get("/", (c) => c.text("ok"));
    const res = await app.request("http://localhost/");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(res.headers.get("strict-transport-security")).toBeNull();
    expect(res.headers.get("cross-origin-resource-policy")).toBeNull();
  });
});
