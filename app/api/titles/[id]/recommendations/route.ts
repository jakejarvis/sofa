import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { titleRecommendations, titles } from "@/lib/db/schema";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const title = await db.select().from(titles).where(eq(titles.id, id)).get();
  if (!title)
    return NextResponse.json({ error: "Title not found" }, { status: 404 });

  const recs = await db
    .select({
      recommendedTitleId: titleRecommendations.recommendedTitleId,
      source: titleRecommendations.source,
      rank: titleRecommendations.rank,
    })
    .from(titleRecommendations)
    .where(eq(titleRecommendations.titleId, id))
    .orderBy(titleRecommendations.rank)
    .all();

  const results = (
    await Promise.all(
      recs.map(async (rec) => {
        const recTitle = await db
          .select()
          .from(titles)
          .where(eq(titles.id, rec.recommendedTitleId))
          .get();
        return recTitle
          ? { ...recTitle, source: rec.source, rank: rec.rank }
          : null;
      }),
    )
  ).filter(Boolean);

  return NextResponse.json(
    results
      .filter((r) => !!r)
      .map((r) => ({
        ...r,
        posterPath: tmdbImageUrl(r.posterPath, "w500"),
        backdropPath: tmdbImageUrl(r.backdropPath, "w1280"),
      })),
  );
}
