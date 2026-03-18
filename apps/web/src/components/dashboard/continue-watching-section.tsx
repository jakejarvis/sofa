import { useLingui } from "@lingui/react/macro";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

import { ContinueWatchingList, ContinueWatchingSectionSkeleton } from "./continue-watching-list";
import { FeedSection } from "./feed-section";

export function ContinueWatchingSection() {
  const { data, isPending } = useQuery(orpc.dashboard.continueWatching.queryOptions());

  const { t } = useLingui();

  if (isPending) return <ContinueWatchingSectionSkeleton />;

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection
      title={t`Continue Watching`}
      icon={<IconPlayerPlay className="text-primary size-5" />}
    >
      <ContinueWatchingList items={items} />
    </FeedSection>
  );
}
