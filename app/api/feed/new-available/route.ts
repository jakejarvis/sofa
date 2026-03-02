import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getNewAvailableFeed } from "@/lib/services/discovery";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Number(req.nextUrl.searchParams.get("days") ?? 14);
  const feed = await getNewAvailableFeed(session.user.id, days);
  return NextResponse.json(
    feed.map((item) => ({
      ...item,
      posterPath: tmdbImageUrl(item.posterPath, "w500"),
    })),
  );
}
