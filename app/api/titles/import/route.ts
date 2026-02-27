import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/api/auth-guard";
import { badRequest, unauthorized } from "@/lib/api/errors";
import { importTitle } from "@/lib/services/metadata";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    throw e;
  }

  const body = await req.json();
  const { tmdbId, type } = body;

  if (!tmdbId || !type || !["movie", "tv"].includes(type)) {
    return badRequest("tmdbId and type (movie|tv) are required");
  }

  const title = await importTitle(tmdbId, type);
  return NextResponse.json(title);
}
