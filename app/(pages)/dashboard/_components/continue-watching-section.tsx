"use client";

import { IconPlayerPlay } from "@tabler/icons-react";
import { ContinueWatchingSectionSkeleton } from "@/components/skeletons";
import { useContinueWatching } from "@/lib/queries/dashboard";
import { ContinueWatchingList } from "./continue-watching-list";
import { FeedSection } from "./feed-section";

export function ContinueWatchingSection() {
  const { data, isPending } = useContinueWatching();

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
