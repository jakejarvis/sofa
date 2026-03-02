import { IconSparkles } from "@tabler/icons-react";
import { getRecommendationsFeed } from "@/lib/services/discovery";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { FeedSection } from "./feed-section";
import { TitleGrid } from "./title-grid";

export async function RecommendationsSection({ userId }: { userId: string }) {
  const feed = await getRecommendationsFeed(userId);
  if (feed.length === 0) return null;

  const items = feed
    .filter((item) => !!item)
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      tmdbId: t.tmdbId,
      type: t.type,
      title: t.title,
      posterPath: tmdbImageUrl(t.posterPath, "w500"),
      releaseDate: t.releaseDate ?? t.firstAirDate,
      voteAverage: t.voteAverage,
    }));

  return (
    <FeedSection
      title="Recommended for You"
      icon={<IconSparkles size={20} className="text-primary" />}
    >
      <TitleGrid items={items} />
    </FeedSection>
  );
}
