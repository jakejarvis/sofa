"use client";

import { IconBooks } from "@tabler/icons-react";
import { TitleGridSectionSkeleton } from "@/components/skeletons";
import { useDashboardLibrary } from "@/lib/queries/dashboard";
import { FeedSection } from "./feed-section";
import { TitleGrid } from "./title-grid";

export function LibrarySection() {
  const { data, isPending } = useDashboardLibrary();

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
