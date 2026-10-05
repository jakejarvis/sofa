import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { UpdateUserPlatformsInput, WatchInput } from "@sofa/api/schemas";
import { auth } from "@sofa/auth/server";

import { apiBodyLimit } from "../src/body-limits";

vi.mock("@sofa/auth/server", () => ({
  auth: {
    api: { getSession: vi.fn<() => void>() },
  },
}));

const getSession = vi.mocked(auth.api.getSession);

const MB = 1024 * 1024;

const app = new Hono();
app.use("/rpc/*", apiBodyLimit);
app.post("/rpc/*", async (c) => c.text(String((await c.req.arrayBuffer()).byteLength)));

function post(path: string, body: NonNullable<RequestInit["body"]>, init: RequestInit = {}) {
  return app.request(path, { method: "POST", body, ...init });
}

beforeEach(() => {
  getSession.mockReset();
});

describe("apiBodyLimit", () => {
  test("rejects a 5 MB body on an ordinary route with 413", async () => {
    const res = await post("/rpc/tracking/watch", "x".repeat(5 * MB));
    expect(res.status).toBe(413);
  });

  test("rejects a chunked 5 MB body on an ordinary route with 413", async () => {
    const chunk = new Uint8Array(MB);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 5) {
          controller.close();
          return;
        }
        sent += 1;
        controller.enqueue(chunk);
      },
    });
    const res = await post("/rpc/tracking/watch", stream, {
      duplex: "half",
    } as RequestInit);
    expect(res.status).toBe(413);
  });

  test("passes a 1 KB body on an ordinary route", async () => {
    const res = await post("/rpc/tracking/watch", "x".repeat(1024));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("1024");
  });

  test("rejects an unauthenticated upload before reading the body", async () => {
    getSession.mockResolvedValue(null);
    const res = await post("/rpc/imports/parseFile", "x".repeat(1024));
    expect(res.status).toBe(401);
  });

  test("allows a 5 MB upload with a session", async () => {
    getSession.mockResolvedValue({
      session: { id: "s1", userId: "user-1" },
      user: { id: "user-1", role: "user" },
    } as never);
    const res = await post("/rpc/imports/parseFile", "x".repeat(5 * MB));
    expect(res.status).toBe(200);
  });
});

describe("array bounds", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => String(i));

  test("WatchInput caps ids at 20000", () => {
    expect(WatchInput.safeParse({ scope: "episode", ids: ids(20001) }).success).toBe(false);
    expect(WatchInput.safeParse({ scope: "episode", ids: ids(20000) }).success).toBe(true);
  });

  test("UpdateUserPlatformsInput caps platformIds at 500", () => {
    expect(UpdateUserPlatformsInput.safeParse({ platformIds: Array(501).fill("p") }).success).toBe(
      false,
    );
    expect(UpdateUserPlatformsInput.safeParse({ platformIds: Array(500).fill("p") }).success).toBe(
      true,
    );
  });
});
