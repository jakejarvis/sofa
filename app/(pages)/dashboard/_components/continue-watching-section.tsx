import { IconPlayerPlay } from "@tabler/icons-react";
import { getContinueWatchingFeed } from "@/lib/services/discovery";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { ContinueWatchingItemProps } from "./continue-watching-card";
import { ContinueWatchingList } from "./continue-watching-list";
import { FeedSection } from "./feed-section";

export async function ContinueWatchingSection({ userId }: { userId: string }) {
  const feed = await getContinueWatchingFeed(userId);
  if (feed.length === 0) return null;

  const items: ContinueWatchingItemProps[] = feed.map((item) => ({
    title: {
      id: item.title.id,
      title: item.title.title,
      backdropPath: tmdbImageUrl(item.title.backdropPath, "w1280"),
    },
    nextEpisode: item.nextEpisode
      ? {
          seasonNumber: item.nextEpisode.seasonNumber,
          episodeNumber: item.nextEpisode.episodeNumber,
          name: item.nextEpisode.name,
          stillPath: tmdbImageUrl(
            item.nextEpisode.stillPath,
            "w1280",
            "stills",
          ),
        }
      : null,
    totalEpisodes: item.totalEpisodes,
    watchedEpisodes: item.watchedEpisodes,
  }));

  return (
    <FeedSection
      title="Continue Watching"
      icon={<IconPlayerPlay className="size-5 text-primary" />}
    >
      <ContinueWatchingList items={items} />
    </FeedSection>
  );
}
