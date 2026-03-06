import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSystemHealth } from "@/lib/services/system-health";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const health = await getSystemHealth();
  return NextResponse.json(health);
}
