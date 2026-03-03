export async function onRequestError() {
  // Required by Next.js instrumentation
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Ensure image cache directories exist (all environments)
    const { ensureImageDirs, imageCacheEnabled } = await import(
      "@/lib/services/image-cache"
    );
    if (imageCacheEnabled()) {
      ensureImageDirs();
    }

    // Run database migrations on startup
    const { runMigrations } = await import("@/lib/db/migrate");
    runMigrations();

    // Initialize job scheduler
    const { startJobs, stopJobs } = await import("@/lib/cron");
    startJobs();

    // Graceful shutdown — stop jobs and close DB on container stop
    const { closeDatabase } = await import("@/lib/db/client");

    const shutdown = () => {
      console.log("[shutdown] Stopping scheduler...");
      stopJobs();
      console.log("[shutdown] Closing database...");
      closeDatabase();
      console.log("[shutdown] Clean shutdown complete");
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
}
