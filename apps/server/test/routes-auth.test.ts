import { beforeEach, describe, expect, test, vi } from "vitest";

import { auth } from "@sofa/auth/server";
import { clearAllTables } from "@sofa/test/db";

import avatars from "../src/routes/avatars";
import backups from "../src/routes/backups";
import exportRoute from "../src/routes/export";
import lists from "../src/routes/lists";
import webhooks from "../src/routes/webhooks";

vi.mock("@sofa/auth/server", () => ({
  auth: {
    api: { getSession: vi.fn<() => void>(), updateUser: vi.fn<() => void>() },
    handler: vi.fn<() => void>(),
  },
}));

const getSession = vi.mocked(auth.api.getSession);

function userSession(role: "user" | "admin" = "user") {
  return {
    session: { id: "s1", userId: "user-1" },
    user: { id: "user-1", role, name: "U", email: "u@example.com" },
  } as never;
}

beforeEach(() => {
  clearAllTables();
  getSession.mockReset();
});

describe("backups route", () => {
  test("rejects a missing session with 401", async () => {
    getSession.mockResolvedValue(null);
    const res = await backups.request("/sofa-backup.db");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  test("rejects a non-admin with 403 and bypasses the cookie cache", async () => {
    getSession.mockResolvedValue(userSession("user"));
    const res = await backups.request("/sofa-backup.db");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } }),
    );
  });
});

describe("export route", () => {
  test("rejects a missing session with 401", async () => {
    getSession.mockResolvedValue(null);
    const res = await exportRoute.request("/user-data");
    expect(res.status).toBe(401);
  });
});

describe("avatars route", () => {
  test("rejects a missing session with 401", async () => {
    getSession.mockResolvedValue(null);
    const res = await avatars.request("/user-1");
    expect(res.status).toBe(401);
  });
});

describe("webhooks route", () => {
  test("returns 200 { ok: true } for an unknown token", async () => {
    const res = await webhooks.request("/not-a-real-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("lists route", () => {
  test("returns 200 [] for an unknown token", async () => {
    const res = await lists.request("/not-a-real-token");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
