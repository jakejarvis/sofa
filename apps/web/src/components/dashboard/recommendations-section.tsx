import { useLingui } from "@lingui/react/macro";
import { IconThumbUp } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

import { FeedSection } from "./feed-section";
import { TitleGrid, TitleGridSectionSkeleton } from "./title-grid";

export function RecommendationsSection() {
  const { data, isPending } = useQuery(orpc.discover.recommendations.queryOptions());

  const { t } = useLingui();

  if (isPending) return <TitleGridSectionSkeleton />;

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection
      title={t`Recommended for You`}
      icon={<IconThumbUp className="text-primary size-5" />}
    >
      <TitleGrid items={items} />
    </FeedSection>
  );
}
