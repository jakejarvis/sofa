import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { triggerJob } from "@/lib/cron";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await params;
  if (!name)
    return NextResponse.json({ error: "Missing job name" }, { status: 400 });

  const triggered = await triggerJob(name);
  if (!triggered)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
