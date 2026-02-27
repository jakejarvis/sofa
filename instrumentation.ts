export async function onRequestError() {
  // Required by Next.js instrumentation
}

export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production"
  ) {
    const { initJobs } = await import("@/lib/jobs/init");
    initJobs();
  }
}
