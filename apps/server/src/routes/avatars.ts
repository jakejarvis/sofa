import path from "node:path";
import { auth } from "@sofa/auth/server";
import { AVATAR_DIR } from "@sofa/db/constants";
import { Hono } from "hono";

const app = new Hono();

app.get("/:userId", async (c) => {
  // Auth check
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.param("userId");

  // Sanitize userId to prevent path traversal
  const safeUserId = path.basename(userId);
  if (!safeUserId || safeUserId !== userId || safeUserId.includes("..")) {
    return c.json({ error: "Invalid user ID" }, 400);
  }

  // Find the avatar file (could be .jpg, .png, .webp, .gif)
  const glob = new Bun.Glob(`${safeUserId}.*`);
  const matches = await Array.fromAsync(glob.scan(AVATAR_DIR));
  if (matches.length === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  const file = Bun.file(path.join(AVATAR_DIR, matches[0]));
  if (!(await file.exists())) {
    return c.json({ error: "Not found" }, 404);
  }

  return new Response(await file.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": file.type,
    },
  });
});

export default app;
