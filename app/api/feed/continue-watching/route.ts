import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/api/auth-guard";
import { unauthorized } from "@/lib/api/errors";
import { getContinueWatchingFeed } from "@/lib/services/discovery";

export async function GET() {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    throw e;
  }
  const feed = getContinueWatchingFeed(userId);
  return NextResponse.json(feed);
}
