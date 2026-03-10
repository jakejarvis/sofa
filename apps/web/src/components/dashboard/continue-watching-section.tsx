import { IconPlayerPlay } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import {
  ContinueWatchingList,
  ContinueWatchingSectionSkeleton,
} from "./continue-watching-list";
import { FeedSection } from "./feed-section";

export function ContinueWatchingSection() {
  const { data, isPending } = useQuery(
    orpc.dashboard.continueWatching.queryOptions(),
  );

  if (isPending) return <ContinueWatchingSectionSkeleton />;

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection
      title="Continue Watching"
      icon={<IconPlayerPlay className="size-5 text-primary" />}
    >
      <ContinueWatchingList items={items} />
    </FeedSection>
  );
}
