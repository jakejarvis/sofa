import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isTmdbConfigured } from "@/lib/config";
import { getGenres } from "@/lib/tmdb/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isTmdbConfigured())
    return NextResponse.json(
      { error: "TMDB API key is not configured." },
      { status: 503 },
    );

  const mediaType = req.nextUrl.searchParams.get("type");
  if (mediaType !== "movie" && mediaType !== "tv")
    return NextResponse.json(
      { error: "type must be movie or tv" },
      { status: 400 },
    );

  const data = await getGenres(mediaType);
  return NextResponse.json({ genres: data.genres ?? [] });
}
