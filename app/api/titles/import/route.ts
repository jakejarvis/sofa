import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { importTitle } from "@/lib/services/metadata";

const bodySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  type: z.enum(["movie", "tv"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = bodySchema.safeParse(await req.json().catch(() => null));
  if (!result.success) {
    return NextResponse.json(
      { error: "tmdbId (positive integer) and type (movie|tv) are required" },
      { status: 400 },
    );
  }

  try {
    const title = await importTitle(result.data.tmdbId, result.data.type);
    return NextResponse.json(title);
  } catch {
    return NextResponse.json(
      { error: "Failed to import title" },
      { status: 502 },
    );
  }
}
