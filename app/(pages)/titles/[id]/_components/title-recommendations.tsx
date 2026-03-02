import { getRecommendationsForTitle } from "@/lib/services/discovery";
import type { RecommendedTitle } from "@/lib/types/title";
import { RecommendationsGrid } from "./recommendations-grid";

export async function TitleRecommendations({ titleId }: { titleId: string }) {
  const recs = await getRecommendationsForTitle(titleId);
  if (recs.length === 0) return null;

  const recommendations: RecommendedTitle[] = recs.map((r) => ({
    id: r.id,
    tmdbId: r.tmdbId,
    type: r.type,
    title: r.title,
    posterPath: r.posterPath,
    releaseDate: r.releaseDate,
    firstAirDate: r.firstAirDate,
    voteAverage: r.voteAverage,
  }));

  return <RecommendationsGrid recommendations={recommendations} />;
}
