import { call } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { auth } from "@sofa/auth/server";
import {
  clearAllTables,
  insertEpisodeWatch,
  insertStatus,
  insertTvShow,
  insertUser,
} from "@sofa/test/db";

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
  getSession.mockReset();
  getSession.mockResolvedValue(sessionFor("user-1"));
});

describe("library.continueWatching", () => {
  test("includes the next episode id", async () => {
    const { titleId, episodeIds } = insertTvShow("tv-1", 1001, 1, 3, {
      airDates: ["2020-01-01", "2020-01-08", "2020-01-15"],
    });
    insertStatus("user-1", titleId, "in_progress");
    insertEpisodeWatch("user-1", episodeIds[0]!);

    const result = await call(implementedRouter.library.continueWatching, undefined, ctx);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.nextEpisode?.id).toBe(episodeIds[1]);
  });
});
