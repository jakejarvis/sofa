import { useLingui } from "@lingui/react/macro";
import { IconCalendarEvent } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

import { FeedSection } from "./feed-section";
import { UpcomingRow } from "./upcoming-item";

export function UpcomingSection() {
  const { data, isPending } = useQuery(
    orpc.dashboard.upcoming.queryOptions({ input: { days: 7, limit: 5 } }),
  );

  const { t } = useLingui();

  if (isPending) return null;

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection
      title={t`Upcoming`}
      icon={<IconCalendarEvent className="text-primary size-5" />}
      seeAllLink="/upcoming"
    >
      <div className="divide-border/50 divide-y">
        {items.map((item, i) => (
          <UpcomingRow key={`${item.titleId}-${item.date}-${i}`} item={item} />
        ))}
      </div>
    </FeedSection>
  );
}
