import { Trans, useLingui } from "@lingui/react/macro";
import { IconCalendarEvent } from "@tabler/icons-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { UpcomingRow } from "@/components/dashboard/upcoming-item";
import { RouteError } from "@/components/route-error";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { orpc } from "@/lib/orpc/client";
import { groupByDateBucket } from "@sofa/i18n/date-buckets";

const upcomingSearchSchema = z.object({
  type: z.enum(["all", "movie", "tv"]).optional().catch(undefined),
  status: z.enum(["all", "watching", "watchlist"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_app/upcoming")({
  validateSearch: zodValidator(upcomingSearchSchema),
  staleTime: 30_000,
  loader: async ({ context }) => {
    await context.queryClient.ensureInfiniteQueryData(
      orpc.library.upcoming.infiniteOptions({
        input: (pageParam: string | undefined) => ({
          days: 90,
          limit: 20,
          cursor: pageParam,
        }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        maxPages: 10,
      }),
    );
  },
  head: () => ({ meta: [{ title: "Upcoming — Sofa" }] }),
  pendingComponent: UpcomingSkeleton,
  errorComponent: RouteError,
  component: UpcomingPage,
});

function UpcomingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 py-2">
          <Skeleton className="size-[52px] rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function UpcomingPage() {
  const { t } = useLingui();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const typeFilter = search.type ?? "all";
  const statusFilter = search.status ?? "all";

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(
    orpc.library.upcoming.infiniteOptions({
      input: (pageParam: string | undefined) => ({
        days: 90,
        limit: 20,
        cursor: pageParam,
        mediaType: typeFilter !== "all" ? (typeFilter as "movie" | "tv") : undefined,
        statusFilter:
          statusFilter !== "all" ? [statusFilter as "watching" | "watchlist"] : undefined,
      }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      maxPages: 10,
    }),
  );

  const sentinelRef = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  function setTypeFilter(value: string) {
    void navigate({
      search: (prev) => ({
        ...prev,
        type: value === "all" ? undefined : (value as "movie" | "tv"),
      }),
      replace: true,
    });
  }

  function setStatusFilter(value: string) {
    void navigate({
      search: (prev) => ({
        ...prev,
        status: value === "all" ? undefined : (value as "watching" | "watchlist"),
      }),
      replace: true,
    });
  }

  const filterToggles = (
    <div className="flex flex-wrap gap-3">
      <ToggleGroup
        value={[typeFilter]}
        onValueChange={(values) => {
          const next = values.find((v) => v !== typeFilter) ?? "all";
          setTypeFilter(next);
        }}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="all">{t`All`}</ToggleGroupItem>
        <ToggleGroupItem value="movie">{t`Movies`}</ToggleGroupItem>
        <ToggleGroupItem value="tv">{t`TV Shows`}</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup
        value={[statusFilter]}
        onValueChange={(values) => {
          const next = values.find((v) => v !== statusFilter) ?? "all";
          setStatusFilter(next);
        }}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="all">{t`All`}</ToggleGroupItem>
        <ToggleGroupItem value="watching">{t`Watching`}</ToggleGroupItem>
        <ToggleGroupItem value="watchlist">{t`Watchlist`}</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  if (isPending) return <UpcomingSkeleton />;

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  if (allItems.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <UpcomingHeader />
        {filterToggles}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconCalendarEvent className="text-muted-foreground/40 size-12" />
          <p className="text-muted-foreground mt-4 text-sm">
            <Trans>No upcoming episodes or releases in the next 90 days.</Trans>
          </p>
        </div>
      </div>
    );
  }

  const buckets = groupByDateBucket(allItems);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <UpcomingHeader />
      {filterToggles}
      {buckets.map((bucket) => (
        <section key={bucket.key}>
          <h2 className="font-display text-muted-foreground mb-2 text-sm font-medium tracking-wider uppercase">
            {bucket.label}
          </h2>
          <div className="space-y-2">
            {bucket.items.map((item, i) => (
              <UpcomingRow key={`${item.titleId}-${item.date}-${i}`} item={item} />
            ))}
          </div>
        </section>
      ))}
      <div ref={sentinelRef} />
      {isFetchingNextPage && <UpcomingSkeleton />}
    </div>
  );
}

function UpcomingHeader() {
  const { t } = useLingui();
  return (
    <div>
      <h1 className="font-display text-2xl tracking-tight">{t`Upcoming`}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        <Trans>Episodes and movies coming up in the next 90 days.</Trans>
      </p>
    </div>
  );
}
