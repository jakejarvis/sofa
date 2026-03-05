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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = body as { tmdbId?: unknown; type?: unknown };
  const type = parsed.type;
  const tmdbId =
    typeof parsed.tmdbId === "number"
      ? parsed.tmdbId
      : Number.parseInt(String(parsed.tmdbId), 10);

  if (
    !Number.isInteger(tmdbId) ||
    tmdbId < 1 ||
    (type !== "movie" && type !== "tv")
  ) {
    return NextResponse.json(
      { error: "tmdbId (positive integer) and type (movie|tv) are required" },
      { status: 400 },
    );
  }

  try {
    const title = await importTitle(tmdbId, type);
    return NextResponse.json(title);
  } catch {
    return NextResponse.json(
      { error: "Failed to import title" },
      { status: 502 },
    );
  }
}
