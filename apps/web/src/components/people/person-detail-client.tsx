import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { orpc } from "@/lib/orpc/client";
import { FilmographyGrid } from "./filmography-grid";
import { PersonHero } from "./person-hero";

export function PersonDetailSkeleton() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <Skeleton className="size-40 shrink-0 self-center rounded-2xl sm:size-56 sm:self-start" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-2/3 sm:h-12" />
          <Skeleton className="h-5 w-24 rounded-md" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PersonDetailClient({ id }: { id: string }) {
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      orpc.people.detail.infiniteOptions({
        input: (pageParam: number) => ({ id, page: pageParam, limit: 20 }),
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

  const person = data?.pages[0]?.person;
  const filmography = useMemo(
    () => data?.pages.flatMap((p) => p.filmography) ?? [],
    [data?.pages],
  );
  const userStatuses = useMemo(
    () =>
      Object.assign(
        {},
        ...(data?.pages.map((p) => p.userStatuses) ?? []),
      ) as Record<string, "watchlist" | "in_progress" | "completed">,
    [data?.pages],
  );

  if (isPending) return <PersonDetailSkeleton />;
  if (!person) return null;

  return (
    <div className="space-y-10">
      <PersonHero person={person} />
      <FilmographyGrid credits={filmography} userStatuses={userStatuses} />
      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
