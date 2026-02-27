import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api/errors";
import { registerJobs } from "@/lib/jobs/registry";
import { scheduler } from "@/lib/jobs/scheduler";

// Ensure jobs are registered for manual triggering
registerJobs();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const jobNames = scheduler.getJobNames();

  if (!jobNames.includes(name)) {
    return badRequest(
      `Unknown job: ${name}. Available: ${jobNames.join(", ")}`,
    );
  }

  await scheduler.runNow(name);
  return NextResponse.json({ ok: true, job: name });
}
