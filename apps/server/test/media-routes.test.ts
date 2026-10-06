import { writeFileSync } from "node:fs";
import path from "node:path";

import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { auth } from "@sofa/auth/server";
import { AVATAR_DIR } from "@sofa/config";

import { IMAGE_CONTENT_SECURITY_POLICY, imageSecurityHeaders } from "../src/image-headers";
import { SECURITY_HEADERS_OPTIONS } from "../src/request-guards";
import avatars from "../src/routes/avatars";
import images from "../src/routes/images";

vi.mock("@sofa/auth/server", () => ({
  auth: {
    api: { getSession: vi.fn<() => void>(), updateUser: vi.fn<() => void>() },
    handler: vi.fn<() => void>(),
  },
}));
vi.mock("@sofa/core/image-cache", () => ({
  imageCacheEnabled: () => true,
  fetchAndMaybeCache: vi.fn<() => Promise<{ buffer: Buffer; contentType: string }>>(async () => ({
    buffer: Buffer.from([1, 2, 3]),
    contentType: "image/jpeg",
  })),
}));
// A throwaway avatar directory. The factory is hoisted above the imports, so it loads its own
// Node modules; the test reads the same path back through the mocked `AVATAR_DIR` import.
vi.mock("@sofa/config", async (importOriginal) => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  return {
    ...(await importOriginal<typeof import("@sofa/config")>()),
    AVATAR_DIR: mkdtempSync(join(tmpdir(), "sofa-avatars-")),
  };
});

const getSession = vi.mocked(auth.api.getSession);

const app = new Hono();
app.use("/images/*", imageSecurityHeaders);
app.use("/api/avatars/*", imageSecurityHeaders);
app.use("*", secureHeaders(SECURITY_HEADERS_OPTIONS));
app.route("/images", images);
app.route("/api/avatars", avatars);
app.get("/other", (c) => c.text("ok"));

beforeEach(() => {
  getSession.mockReset();
});

describe("image route", () => {
  test("serves a valid name with the sandboxing CSP", async () => {
    const res = await app.request("/images/posters/kqjL17yufvn9OVLyXYpvtyrFfak.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("content-security-policy")).toBe(IMAGE_CONTENT_SECURITY_POLICY);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("rejects a name with an encoded query string", async () => {
    const res = await app.request("/images/posters/abc.jpg%3Fx%3D1");
    expect(res.status).toBe(400);
  });

  test("rejects a name with a trailing extension", async () => {
    const res = await app.request("/images/posters/abc.jpg.html");
    expect(res.status).toBe(400);
  });

  test("rejects a name with wildcard characters", async () => {
    const res = await app.request("/images/posters/a%2Ab.jpg");
    expect(res.status).toBe(400);
  });

  test("rejects an unknown category", async () => {
    const res = await app.request("/images/secrets/abc.jpg");
    expect(res.status).toBe(400);
  });
});

describe("avatar route", () => {
  beforeEach(() => {
    getSession.mockResolvedValue({
      session: { id: "s1", userId: "user-1" },
      user: { id: "user-1", role: "user", name: "U", email: "u@example.com" },
    } as never);
  });

  test("serves an existing avatar with the sandboxing CSP", async () => {
    writeFileSync(path.join(AVATAR_DIR, "user-1.png"), Buffer.from([1]));
    const res = await app.request("/api/avatars/user-1");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("content-security-policy")).toBe(IMAGE_CONTENT_SECURITY_POLICY);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("rejects wildcard user ids", async () => {
    const res = await app.request("/api/avatars/user-%2A");
    expect(res.status).toBe(400);
  });

  test("returns 404 for an unknown user", async () => {
    const res = await app.request("/api/avatars/user-2");
    expect(res.status).toBe(404);
  });
});

describe("other routes", () => {
  test("keep the app-wide CSP without the sandbox directive", async () => {
    const res = await app.request("/other");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toContain("sandbox");
  });
});
