import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@vercel/firewall", () => ({
  checkRateLimit: vi.fn<() => Promise<{ rateLimited: boolean }>>(async () => ({
    rateLimited: false,
  })),
}));

import app from "./app";

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.POSTHOG_API_KEY = "test-key";
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
});

afterEach(() => {
  delete process.env.POSTHOG_API_KEY;
  vi.restoreAllMocks();
});

function postTelemetry(body: unknown) {
  return app.request("/v1/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function sentPayload() {
  const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
  return JSON.parse(init.body as string);
}

describe("POST /v1/telemetry", () => {
  test("drops injected feature keys and never lets features override core fields", async () => {
    const res = await postTelemetry({
      instanceId: "abc",
      version: "0.2.0",
      users: "1-5",
      features: { imageCache: true, version: "9.9.9", $set: { a: 1 } },
    });
    expect(res.status).toBe(204);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const payload = sentPayload();
    expect(payload.distinct_id).toBe("abc");
    expect(payload.properties.version).toBe("0.2.0");
    expect(payload.properties.imageCache).toBe(true);
    expect(payload.properties.users).toBe("1-5");
    expect(Object.keys(payload.properties)).not.toContain("$set");
  });

  test("forwards a real-client-shaped payload", async () => {
    const res = await postTelemetry({
      instanceId: "01912345-6789-7abc-8def-0123456789ab",
      version: "0.2.0",
      arch: "linux-x64",
      users: "1-5",
      titles: "100-500",
      features: { imageCache: true, oidc: false, scheduledBackups: true },
    });
    expect(res.status).toBe(204);
    const { properties } = sentPayload();
    expect(properties.imageCache).toBe(true);
    expect(properties.oidc).toBe(false);
    expect(properties.scheduledBackups).toBe(true);
    expect(properties.arch).toBe("linux-x64");
    expect(properties.titles).toBe("100-500");
  });

  test("rejects a missing instanceId", async () => {
    const res = await postTelemetry({ version: "0.2.0" });
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("rejects an oversized instanceId", async () => {
    const res = await postTelemetry({ instanceId: "a".repeat(65), version: "0.2.0" });
    expect(res.status).toBe(400);
  });
});

describe("GET /v1/version", () => {
  test("redirects query strings to the cacheable URL without calling GitHub", async () => {
    const res = await app.request("/v1/version?x=1");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/v1/version");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("serves the latest release without a query string", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ tag_name: "v0.2.0", html_url: "https://example.com/r" }), {
        status: 200,
      }),
    );
    const res = await app.request("/v1/version");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: "0.2.0", release_url: "https://example.com/r" });
  });
});
