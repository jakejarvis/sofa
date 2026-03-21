import { type Context, Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";

import { CACHE_DIR } from "@sofa/config";
import { ensureBackupDir } from "@sofa/core/backup";
import { ensureImageDirs, imageCacheEnabled } from "@sofa/core/image-cache";
import { registerJobScheduleProvider } from "@sofa/core/system-health";
import { closeDatabase, isDatabaseAccessBlocked } from "@sofa/db/client";
import { runMigrations } from "@sofa/db/migrate";
import { createLogger } from "@sofa/logger";

import { getJobSchedules, startJobs, stopJobs } from "./cron";
import { handler as rpcHandler } from "./orpc/handler";
import { openApiHandler } from "./orpc/openapi-handler";
import authRoutes from "./routes/auth";
import avatarsRoutes from "./routes/avatars";
import backupsRoutes from "./routes/backups";
import exportRoutes from "./routes/export";
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
    maxAge: 86400,
  }),
);

app.use("*", async (c, next) => {
  if (isDatabaseAccessBlocked() && c.req.path !== "/api/health") {
    return c.json({ error: "Service unavailable during database restore" }, 503);
  }
  await next();
});

// Non-RPC routes
app.route("/api/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/avatars", avatarsRoutes);
app.route("/api/backup", backupsRoutes);
app.route("/api/export", exportRoutes);
app.route("/api/webhooks", webhooksRoutes);
app.route("/api/lists", listsRoutes);

// Cached images — serve from disk (fast path), fall back to TMDB fetch on miss
if (imageCacheEnabled()) {
  app.use(
    "/images/*",
    serveStatic({
      root: CACHE_DIR,
      rewriteRequestPath: (path) => path.replace("/images", ""),
      onFound: (_path, c) => {
        c.header("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
}
app.route("/images", imagesRoutes);

// oRPC RPC handler
app.all("/rpc/*", async (c) => {
  const { response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: { headers: c.req.raw.headers },
  });
  return response ?? c.text("Not found", 404);
});

// oRPC OpenAPI handler + Scalar docs
const handleOpenApi = async (c: Context) => {
  const { response } = await openApiHandler.handle(c.req.raw, {
    prefix: "/api/v1",
    context: { headers: c.req.raw.headers },
  });
  return response ?? c.text("Not found", 404);
};

app.all("/api/v1", handleOpenApi);
app.all("/api/v1/*", handleOpenApi);

// ─── SPA static serving (production) ─────────────────────────

if (process.env.NODE_ENV === "production") {
  const { resolve } = await import("node:path");
  const spaDir = resolve(import.meta.dir, "../../../apps/web/dist");

  // Hashed assets — immutable cache
  app.use(
    "/assets/*",
    serveStatic({
      root: spaDir,
      onFound: (_path, c) => {
        c.header("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
  // Return 404 for missing /assets/* (stale chunks after deploy) instead of SPA fallback
  app.all("/assets/*", (c) => c.text("Not found", 404));
  // Other static files (icons, manifest, etc.)
  app.use("*", serveStatic({ root: spaDir }));
  // SPA fallback — serve index.html for all unmatched routes
  app.get("*", serveStatic({ root: spaDir, path: "/index.html" }));
}

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

const port = Number(process.env.PORT || process.env.API_PORT || 3001);
log.info(`API server listening on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
