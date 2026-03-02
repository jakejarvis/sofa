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
    if (process.env.NODE_ENV === "production") {
      const { runMigrations } = await import("@/lib/db/migrate");
      await runMigrations();

      const { initJobs } = await import("@/lib/jobs/init");
      initJobs();

      // Graceful shutdown — stop jobs and close DB on container stop
      const { scheduler } = await import("@/lib/jobs/scheduler");
      const { client } = await import("@/lib/db/client");

      const shutdown = () => {
        console.log("[shutdown] Stopping scheduler...");
        scheduler.stop();
        console.log("[shutdown] Closing database...");
        client.close();
        console.log("[shutdown] Clean shutdown complete");
        process.exit(0);
      };

      process.on("SIGTERM", shutdown);
      process.on("SIGINT", shutdown);
    }
  }
}
