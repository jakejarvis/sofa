export async function onRequestError() {
  // Required by Next.js instrumentation
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { createLogger } = await import("@/lib/logger");
    const log = createLogger("server");

    // Ensure image cache directories exist (all environments)
    const { ensureImageDirs, imageCacheEnabled } = await import(
      "@/lib/services/image-cache"
    );
    if (imageCacheEnabled()) {
      ensureImageDirs();
    }

    // Ensure backup directory exists
    const { ensureBackupDir } = await import("@/lib/services/backup");
    ensureBackupDir();

    // Run database migrations on startup
    const { runMigrations } = await import("@/lib/db/migrate");
    runMigrations();

    // Initialize job scheduler
    const { startJobs, stopJobs } = await import("@/lib/cron");
    startJobs();

    // Graceful shutdown — stop jobs and close DB on container stop
    const { closeDatabase } = await import("@/lib/db/client");

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
  }
}
