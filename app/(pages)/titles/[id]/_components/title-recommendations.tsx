import { getSession } from "@/lib/auth/session";
import { getRecommendationsForTitle } from "@/lib/services/discovery";
import { getUserStatusesByTitleIds } from "@/lib/services/tracking";
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

  const session = await getSession();
  const userStatuses = session
    ? getUserStatusesByTitleIds(
        session.user.id,
        recommendations.map((r) => r.id),
      )
    : {};

  return (
    <RecommendationsGrid
      recommendations={recommendations}
      userStatuses={userStatuses}
    />
  );
}
