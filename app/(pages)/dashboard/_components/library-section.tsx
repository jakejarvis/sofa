import { IconSparkles } from "@tabler/icons-react";
import { getNewAvailableFeed } from "@/lib/services/discovery";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { FeedSection } from "./feed-section";
import { TitleGrid } from "./title-grid";

export async function LibrarySection({ userId }: { userId: string }) {
  const feed = await getNewAvailableFeed(userId);
  if (feed.length === 0) return null;

  const items = feed.slice(0, 10).map((t) => ({
    id: t.titleId,
    tmdbId: t.tmdbId,
    type: t.type,
    title: t.title,
    posterPath: tmdbImageUrl(t.posterPath, "w500"),
    releaseDate: t.releaseDate ?? t.firstAirDate,
    voteAverage: t.voteAverage,
  }));

  return (
    <FeedSection
      title="In Your Library"
      icon={<IconSparkles className="size-5 text-primary" />}
    >
      <TitleGrid items={items} />
    </FeedSection>
  );
}
