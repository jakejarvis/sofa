import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isTmdbConfigured } from "@/lib/config";
import { getSystemHealth } from "@/lib/services/system-health";

export async function GET() {
  const tmdbConfigured = isTmdbConfigured();

  const session = await getSession();
  if (session?.user.role === "admin") {
    const health = await getSystemHealth();
    return NextResponse.json({ tmdbConfigured, health });
  }

  return NextResponse.json({ tmdbConfigured });
}
