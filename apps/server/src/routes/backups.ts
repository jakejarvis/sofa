import path from "node:path";
import { auth } from "@sofa/auth/server";
import { getBackupPath } from "@sofa/core/backup";
import { Hono } from "hono";

const app = new Hono();

app.get("/:filename", async (c) => {
  // Auth + admin check
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (session.user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const filename = c.req.param("filename");

  // Sanitize to prevent path traversal
  const safe = path.basename(filename);
  if (!safe || safe !== filename || safe.includes("..")) {
    return c.json({ error: "Invalid filename" }, 400);
  }

  const backupPath = await getBackupPath(safe);
  if (!backupPath) {
    return c.json({ error: "Not found" }, 404);
  }

  const file = Bun.file(backupPath);

  return new Response(file.stream(), {
    status: 200,
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Content-Length": String(file.size),
      "Cache-Control": "no-store",
    },
  });
});

export default app;
