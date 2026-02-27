import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/api/auth-guard";
import { badRequest, unauthorized } from "@/lib/api/errors";
import { rateTitleStars } from "@/lib/services/tracking";

export async function POST(
  req: NextRequest,
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
  const body = await req.json();
  const { ratingStars } = body;

  if (typeof ratingStars !== "number" || ratingStars < 0 || ratingStars > 5) {
    return badRequest("ratingStars must be 0-5");
  }

  rateTitleStars(userId, id, ratingStars);
  return NextResponse.json({ ok: true });
}
