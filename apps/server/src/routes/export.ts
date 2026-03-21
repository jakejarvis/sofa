import { Hono } from "hono";

import { auth } from "@sofa/auth/server";
import { generateUserExport } from "@sofa/core/export";

const app = new Hono();

app.get("/user-data", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const data = generateUserExport(session.user.id, {
    name: session.user.name,
    email: session.user.email,
  });

  const safeName = session.user.name.replaceAll(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `sofa-export-${safeName}-${date}.json`;
  const json = JSON.stringify(data, null, 2);

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(new TextEncoder().encode(json).byteLength),
      "Cache-Control": "no-store",
    },
  });
});

export default app;
