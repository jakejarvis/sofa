import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { importTitle } from "@/lib/services/metadata";

const bodySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  type: z.enum(["movie", "tv"]),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
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
    return NextResponse.json({ id: title?.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to resolve title" },
      { status: 502 },
    );
  }
}
