"use client";

import { IconThumbUp } from "@tabler/icons-react";
import { TitleGridSectionSkeleton } from "@/components/skeletons";
import { useDashboardRecommendations } from "@/lib/queries/dashboard";
import { FeedSection } from "./feed-section";
import { TitleGrid } from "./title-grid";

export function RecommendationsSection() {
  const { data, isPending } = useDashboardRecommendations();

  if (isPending) return <TitleGridSectionSkeleton />;

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection
      title="Recommended for You"
      icon={<IconThumbUp className="size-5 text-primary" />}
    >
      <TitleGrid items={items} />
    </FeedSection>
  );
}
