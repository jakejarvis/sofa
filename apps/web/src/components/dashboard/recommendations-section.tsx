import { IconThumbUp } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import { FeedSection } from "./feed-section";
import { TitleGrid, TitleGridSectionSkeleton } from "./title-grid";

export function RecommendationsSection() {
  const { data, isPending } = useQuery(
    orpc.dashboard.recommendations.queryOptions(),
  );

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
