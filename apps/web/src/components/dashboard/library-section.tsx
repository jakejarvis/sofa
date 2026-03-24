import { useLingui } from "@lingui/react/macro";
import { IconBooks } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

import { FeedSection } from "./feed-section";
import { TitleGrid, TitleGridSectionSkeleton } from "./title-grid";

export function LibrarySection() {
  const { data, isPending } = useQuery(
    orpc.library.list.queryOptions({ input: { page: 1, limit: 10 } }),
  );

  const { t } = useLingui();

  if (isPending) return <TitleGridSectionSkeleton />;

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection
      title={t`In Your Library`}
      icon={<IconBooks className="text-primary size-5" />}
      seeAllLink="/library"
    >
      <TitleGrid items={items} />
    </FeedSection>
  );
}
