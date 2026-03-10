import { db } from "@sofa/db/client";
import { createLogger } from "@sofa/logger";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

const log = createLogger("health");

const app = new Hono();

app.get("/", (c) => {
  try {
    db.run(sql`SELECT 1`);
    return c.json({ status: "healthy" }, 200);
  } catch (err) {
    log.error("Health check failed:", err);
    return c.json({ status: "unhealthy" }, 503);
  }
});

export default app;
