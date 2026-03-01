import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { episodes } from "@/lib/db/schema";
import { logEpisodeWatch, unwatchSeason } from "@/lib/services/tracking";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const seasonEps = db
    .select()
    .from(episodes)
    .where(eq(episodes.seasonId, id))
    .all();

  for (const ep of seasonEps) {
    logEpisodeWatch(session.user.id, ep.id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  unwatchSeason(session.user.id, id);
  return NextResponse.json({ ok: true });
}
