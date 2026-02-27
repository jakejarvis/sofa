import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/api/auth-guard";
import { unauthorized } from "@/lib/api/errors";
import {
  getUserTitleInfo,
  removeTitleStatus,
  setTitleStatus,
} from "@/lib/services/tracking";

export async function GET(
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
  const info = getUserTitleInfo(userId, id);
  return NextResponse.json(info);
}

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
  const { status } = body;

  if (status === null || status === undefined) {
    removeTitleStatus(userId, id);
  } else {
    setTitleStatus(userId, id, status);
  }

  return NextResponse.json({ ok: true });
}
