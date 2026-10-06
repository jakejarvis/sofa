import { readFile } from "node:fs/promises";
import path from "node:path";

import { Hono } from "hono";

import { auth } from "@sofa/auth/server";
import { AVATAR_DIR } from "@sofa/config";

const AVATAR_USER_ID = /^[A-Za-z0-9_-]{1,128}$/;
// Keep in sync with MIME_TO_EXT in orpc/procedures/account.ts (the extensions uploads are saved with).
const AVATAR_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const app = new Hono();

app.get("/:userId", async (c) => {
  // Auth check
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.param("userId");
  if (!AVATAR_USER_ID.test(userId)) {
    return c.json({ error: "Invalid user ID" }, 400);
  }

  for (const [ext, contentType] of Object.entries(AVATAR_TYPES)) {
    let data: Buffer;
    try {
      data = await readFile(path.join(AVATAR_DIR, `${userId}.${ext}`));
    } catch {
      continue;
    }
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: { "Content-Type": contentType, "Cache-Control": "private, no-cache" },
    });
  }
  return c.json({ error: "Not found" }, 404);
});

export default app;
