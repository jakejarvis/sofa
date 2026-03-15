import { IconBooks } from "@tabler/icons-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { orpc } from "@/lib/orpc/client";
import { FeedSection } from "./feed-section";
import { TitleGrid, TitleGridSectionSkeleton } from "./title-grid";

export function LibrarySection() {
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      orpc.dashboard.library.infiniteOptions({
        input: (pageParam: number) => ({ page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      }),
    );

  const sentinelRef = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  if (isPending) return <TitleGridSectionSkeleton />;

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection
      title="In Your Library"
      icon={<IconBooks className="size-5 text-primary" />}
    >
      <TitleGrid items={items} />
      <div ref={sentinelRef} />
      {isFetchingNextPage && <TitleGridSectionSkeleton />}
    </FeedSection>
  );
}
