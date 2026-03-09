import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getOrFetchTitleByTmdbId } from "@/lib/services/metadata";

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
    return NextResponse.json({ error: "Title not found" }, { status: 404 });

  return NextResponse.json({ id: title.id });
}
