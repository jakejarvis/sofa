import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { triggerJob } from "@/lib/cron";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const jobName = (body as { jobName?: unknown })?.jobName;

  if (!jobName || typeof jobName !== "string") {
    return NextResponse.json(
      { error: "Missing jobName in request body" },
      { status: 400 },
    );
  }

  const triggered = await triggerJob(jobName);
  if (!triggered) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, jobName });
}
