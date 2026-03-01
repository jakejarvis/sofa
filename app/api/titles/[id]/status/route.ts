import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getUserTitleInfo,
  removeTitleStatus,
  setTitleStatus,
} from "@/lib/services/tracking";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const info = await getUserTitleInfo(session.user.id, id);
  return NextResponse.json(info);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (status === null || status === undefined) {
    await removeTitleStatus(session.user.id, id);
  } else {
    await setTitleStatus(session.user.id, id, status);
  }

  return NextResponse.json({ ok: true });
}
