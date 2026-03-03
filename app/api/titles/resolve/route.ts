import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { importTitle } from "@/lib/services/metadata";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tmdbId, type } = body;

  if (!tmdbId || !type || !["movie", "tv"].includes(type)) {
    return NextResponse.json(
      { error: "tmdbId and type (movie|tv) are required" },
      { status: 400 },
    );
  }

  const title = await importTitle(tmdbId, type, { awaitEnrichment: true });
  return NextResponse.json({ id: title?.id });
}
