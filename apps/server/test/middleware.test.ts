import { call } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { auth } from "@sofa/auth/server";
import { importJobs } from "@sofa/db/schema";
import { clearAllTables, insertUser, testDb } from "@sofa/test/db";

import { implementedRouter } from "../src/orpc/router";

vi.mock("@sofa/auth/server", () => ({
  auth: {
    api: { getSession: vi.fn<() => void>(), updateUser: vi.fn<() => void>() },
    handler: vi.fn<() => void>(),
  },
}));

const getSession = vi.mocked(auth.api.getSession);
const ctx = { context: { headers: new Headers() } };

function sessionFor(userId: string, role: "user" | "admin" = "user") {
  return {
    session: { id: `session-${userId}`, userId },
    user: { id: userId, role, name: "U", email: `${userId}@example.com` },
  } as never;
}

function codeOf(error: unknown): unknown {
  return (error as { code?: unknown } | undefined)?.code;
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

function createJob(userId: string): string {
  const id = `job-${Math.random().toString(36).slice(2, 10)}`;
  testDb
    .insert(importJobs)
    .values({
      id,
      userId,
      source: "trakt",
      status: "pending",
      payload: "{}",
      importWatches: true,
      importWatchlist: true,
      importRatings: true,
      createdAt: new Date(),
    })
    .run();
  return id;
}

beforeEach(() => {
  clearAllTables();
  getSession.mockReset();
});

describe("admin middleware", () => {
  test("rejects a missing session with UNAUTHORIZED", async () => {
    getSession.mockResolvedValue(null);
    const error = await rejection(call(implementedRouter.admin.settings.get, undefined, ctx));
    expect(codeOf(error)).toBe("UNAUTHORIZED");
  });

  test("rejects a non-admin user with FORBIDDEN", async () => {
    getSession.mockResolvedValue(sessionFor("user-1", "user"));
    const error = await rejection(call(implementedRouter.admin.settings.get, undefined, ctx));
    expect(codeOf(error)).toBe("FORBIDDEN");
  });

  test("bypasses the cookie cache and lets admins through", async () => {
    getSession.mockResolvedValue(sessionFor("admin-1", "admin"));
    const error = await rejection(call(implementedRouter.admin.settings.get, undefined, ctx));
    expect(getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } }),
    );
    // The call may resolve or fail for unrelated reasons; it must not be an auth rejection.
    expect(["UNAUTHORIZED", "FORBIDDEN"]).not.toContain(codeOf(error));
  });
});

describe("authed middleware", () => {
  test("rejects a missing session with UNAUTHORIZED", async () => {
    getSession.mockResolvedValue(null);
    const error = await rejection(call(implementedRouter.titles.similar, { id: "anything" }, ctx));
    expect(codeOf(error)).toBe("UNAUTHORIZED");
  });
});

describe("import job ownership", () => {
  test("another user's job is FORBIDDEN for getJob and cancelJob", async () => {
    insertUser("user-a");
    insertUser("user-b");
    const jobId = createJob("user-a");
    getSession.mockResolvedValue(sessionFor("user-b"));

    const getError = await rejection(call(implementedRouter.imports.getJob, { id: jobId }, ctx));
    expect(codeOf(getError)).toBe("FORBIDDEN");

    const cancelError = await rejection(
      call(implementedRouter.imports.cancelJob, { id: jobId }, ctx),
    );
    expect(codeOf(cancelError)).toBe("FORBIDDEN");
  });

  test("the owner can read their own job", async () => {
    insertUser("user-a");
    insertUser("user-b");
    const jobId = createJob("user-a");
    getSession.mockResolvedValue(sessionFor("user-a"));

    const job = await call(implementedRouter.imports.getJob, { id: jobId }, ctx);
    expect(job.id).toBe(jobId);
  });
});
