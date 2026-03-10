import { IconBooks } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import { FeedSection } from "./feed-section";
import { TitleGrid, TitleGridSectionSkeleton } from "./title-grid";

export function LibrarySection() {
  const { data, isPending } = useQuery(orpc.dashboard.library.queryOptions());

  if (isPending) return <TitleGridSectionSkeleton />;

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection
      title="In Your Library"
      icon={<IconBooks className="size-5 text-primary" />}
    >
      <TitleGrid items={items} />
    </FeedSection>
  );
}
