import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { userTitleStatus } from "@/lib/db/schema";
import { getOrFetchTitleByTmdbId } from "@/lib/services/metadata";
import { setTitleStatus } from "@/lib/services/tracking";

const schema = z.object({
  tmdbId: z.number().int().positive(),
  type: z.enum(["movie", "tv"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const title = await getOrFetchTitleByTmdbId(
    parsed.data.tmdbId,
    parsed.data.type,
  );
  if (!title)
    return NextResponse.json(
      { error: "Failed to import title" },
      { status: 502 },
    );

  const existing = db
    .select()
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, session.user.id),
        eq(userTitleStatus.titleId, title.id),
      ),
    )
    .get();

  if (!existing) {
    setTitleStatus(session.user.id, title.id, "watchlist");
  }

  return NextResponse.json({
    id: title.id,
    alreadyAdded: !!existing,
  });
}
