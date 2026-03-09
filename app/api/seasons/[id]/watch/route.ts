import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { episodes } from "@/lib/db/schema";
import { logEpisodeWatchBatch, unwatchSeason } from "@/lib/services/tracking";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const seasonEps = db
    .select()
    .from(episodes)
    .where(eq(episodes.seasonId, id))
    .all();
  logEpisodeWatchBatch(
    session.user.id,
    seasonEps.map((ep) => ep.id),
  );

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
  unwatchSeason(session.user.id, id);

  return new NextResponse(null, { status: 204 });
}
