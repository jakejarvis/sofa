import { ensureBackupDir } from "@sofa/core/backup";
import { ensureImageDirs, imageCacheEnabled } from "@sofa/core/image-cache";
import { registerJobScheduleProvider } from "@sofa/core/system-health";
import { closeDatabase } from "@sofa/db/client";
import { createLogger } from "@sofa/db/logger";
import { runMigrations } from "@sofa/db/migrate";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getJobSchedules, startJobs, stopJobs } from "./cron";
import { handler as rpcHandler } from "./orpc/handler";
import { openApiHandler } from "./orpc/openapi-handler";
import authRoutes from "./routes/auth";
import avatarsRoutes from "./routes/avatars";
import backupsRoutes from "./routes/backups";
import healthRoutes from "./routes/health";
import imagesRoutes from "./routes/images";
import listsRoutes from "./routes/lists";
import webhooksRoutes from "./routes/webhooks";

const log = createLogger("server");

// ─── Startup ──────────────────────────────────────────────────

// Ensure directories
if (imageCacheEnabled()) {
  await ensureImageDirs();
}
await ensureBackupDir();

// Run database migrations
runMigrations();

// Wire up job schedule provider for system health
registerJobScheduleProvider(getJobSchedules);

// Start background jobs
startJobs();

// ─── App ──────────────────────────────────────────────────────

const app = new Hono();

// CORS — allow the web app's origin
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

// Non-RPC routes
app.route("/api/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/images", imagesRoutes);
app.route("/api/avatars", avatarsRoutes);
app.route("/api/backup", backupsRoutes);
app.route("/api/webhooks", webhooksRoutes);
app.route("/api/lists", listsRoutes);

// oRPC RPC handler
app.all("/rpc/*", async (c) => {
  const { response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: { headers: c.req.raw.headers },
  });
  return response ?? c.text("Not found", 404);
});

// oRPC OpenAPI handler + Scalar docs
app.all("/api/v1/*", async (c) => {
  const { response } = await openApiHandler.handle(c.req.raw, {
    prefix: "/api/v1",
    context: { headers: c.req.raw.headers },
  });
  return response ?? c.text("Not found", 404);
});

// ─── Graceful shutdown ────────────────────────────────────────

const shutdown = () => {
  log.info("Stopping scheduler...");
  stopJobs();
  log.info("Closing database...");
  closeDatabase();
  log.info("Clean shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

log.info(`API server listening on port ${process.env.API_PORT || 3001}`);

export default {
  port: Number(process.env.API_PORT || 3001),
  fetch: app.fetch,
};
