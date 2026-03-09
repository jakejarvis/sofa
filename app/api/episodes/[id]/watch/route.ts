import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { logEpisodeWatch, unwatchEpisode } from "@/lib/services/tracking";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  logEpisodeWatch(session.user.id, id);

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  unwatchEpisode(session.user.id, id);

  return new NextResponse(null, { status: 204 });
}
