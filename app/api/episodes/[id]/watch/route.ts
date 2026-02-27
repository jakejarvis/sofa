import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/api/auth-guard";
import { unauthorized } from "@/lib/api/errors";
import { logEpisodeWatch } from "@/lib/services/tracking";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    throw e;
  }
  const { id } = await params;
  logEpisodeWatch(userId, id);
  return NextResponse.json({ ok: true });
}
