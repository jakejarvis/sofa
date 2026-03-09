import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserStats } from "@/lib/services/discovery";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = getUserStats(session.user.id);
  return NextResponse.json(stats);
}
