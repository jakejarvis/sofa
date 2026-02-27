import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/api/auth-guard";
import { unauthorized } from "@/lib/api/errors";
import { getNewAvailableFeed } from "@/lib/services/discovery";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    throw e;
  }
  const days = Number(req.nextUrl.searchParams.get("days") ?? 14);
  const feed = getNewAvailableFeed(userId, days);
  return NextResponse.json(feed);
}
