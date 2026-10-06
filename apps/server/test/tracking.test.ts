import { call } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { auth } from "@sofa/auth/server";
import { userMovieWatches } from "@sofa/db/schema";
import { clearAllTables, insertTitle, insertUser, testDb } from "@sofa/test/db";

import { implementedRouter } from "../src/orpc/router";

vi.mock("@sofa/auth/server", () => ({
  auth: {
    api: { getSession: vi.fn<() => void>() },
    handler: vi.fn<() => void>(),
  },
}));

const getSession = vi.mocked(auth.api.getSession);
const ctx = { context: { headers: new Headers() } };

function sessionFor(userId: string) {
  return {
    session: { id: `session-${userId}`, userId },
    user: { id: userId, role: "user", name: "U", email: `${userId}@example.com` },
  } as never;
}

beforeEach(() => {
  clearAllTables();
  insertUser("user-1");
  insertUser("user-2");
  insertTitle({ id: "m1", tmdbId: 1, title: "Movie One" });
  getSession.mockReset();
  getSession.mockResolvedValue(sessionFor("user-1"));
});

describe("tracking.deleteWatch", () => {
  test("another user's watch returns NOT_FOUND with WATCH_NOT_FOUND", async () => {
    testDb
      .insert(userMovieWatches)
      .values({
        id: "w1",
        userId: "user-2",
        titleId: "m1",
        watchedAt: new Date(),
        source: "manual",
      })
      .run();

    await expect(
      call(implementedRouter.tracking.deleteWatch, { kind: "movie", watchId: "w1" }, ctx),
    ).rejects.toMatchObject({ code: "NOT_FOUND", data: { code: "WATCH_NOT_FOUND" } });
    expect(testDb.select().from(userMovieWatches).all()).toHaveLength(1);
  });
});

describe("tracking.logWatch", () => {
  test("rejects a future watchedAt", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await expect(
      call(
        implementedRouter.tracking.logWatch,
        { kind: "movie", id: "m1", watchedAt: future },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(testDb.select().from(userMovieWatches).all()).toHaveLength(0);
  });

  test("logs a past watch", async () => {
    await call(
      implementedRouter.tracking.logWatch,
      { kind: "movie", id: "m1", watchedAt: "2024-03-01T12:00:00.000Z" },
      ctx,
    );
    expect(testDb.select().from(userMovieWatches).all()).toHaveLength(1);
  });
});
