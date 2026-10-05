import { Trans, useLingui } from "@lingui/react/macro";
import { IconHistory } from "@tabler/icons-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { HistoryRow } from "@/components/history/history-row";
import { RouteError } from "@/components/route-error";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { orpc } from "@/lib/orpc/client";
import { formatLocalDate } from "@sofa/i18n/date-buckets";
import { formatDate } from "@sofa/i18n/format";

const historySearchSchema = z.object({
  type: z.enum(["all", "movie", "tv"]).optional().catch(undefined),
  source: z
    .enum(["all", "manual", "import", "plex", "jellyfin", "emby"])
    .optional()
    .catch(undefined),
});

type SourceFilter = "manual" | "import" | "plex" | "jellyfin" | "emby";

export const Route = createFileRoute("/_app/history")({
  validateSearch: zodValidator(historySearchSchema),
  staleTime: 30_000,
  loader: async ({ context }) => {
    await context.queryClient.ensureInfiniteQueryData(
      orpc.tracking.history.infiniteOptions({
        input: (pageParam: string | undefined) => ({
          limit: 30,
          cursor: pageParam,
        }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }),
    );
  },
  head: () => ({ meta: [{ title: "History — Sofa" }] }),
  pendingComponent: HistorySkeleton,
  errorComponent: RouteError,
  component: HistoryPage,
});

function HistorySkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

function HistoryPage() {
  const { t } = useLingui();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const typeFilter = search.type ?? "all";
  const sourceFilter = search.source ?? "all";

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } =
    useInfiniteQuery(
      orpc.tracking.history.infiniteOptions({
        // Omit filter keys (rather than sending "all") so the default input
        // matches the loader's prefetch key.
        input: (pageParam: string | undefined) => ({
          limit: 30,
          cursor: pageParam,
          ...(typeFilter !== "all" ? { type: typeFilter } : {}),
          ...(sourceFilter !== "all" ? { source: sourceFilter } : {}),
        }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }),
    );

  const sentinelRef = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
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

  function setSourceFilter(value: string) {
    void navigate({
      search: (prev) => ({
        ...prev,
        source: value === "all" ? undefined : (value as SourceFilter),
      }),
      replace: true,
    });
  }

  const header = (
    <div>
      <h1 className="font-display text-2xl tracking-tight">{t`History`}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        <Trans>Everything you've watched, newest first.</Trans>
      </p>
    </div>
  );

  const filterToggles = (
    <div className="flex flex-wrap gap-3">
      <ToggleGroup
        value={[typeFilter]}
        onValueChange={(values) => setTypeFilter(values.find((v) => v !== typeFilter) ?? "all")}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="all">{t`All`}</ToggleGroupItem>
        <ToggleGroupItem value="movie">{t`Movies`}</ToggleGroupItem>
        <ToggleGroupItem value="tv">{t`TV Shows`}</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup
        value={[sourceFilter]}
        onValueChange={(values) => setSourceFilter(values.find((v) => v !== sourceFilter) ?? "all")}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="all">{t`All`}</ToggleGroupItem>
        <ToggleGroupItem value="manual">{t`Manual`}</ToggleGroupItem>
        <ToggleGroupItem value="import">{t`Import`}</ToggleGroupItem>
        <ToggleGroupItem value="plex">{t`Plex`}</ToggleGroupItem>
        <ToggleGroupItem value="jellyfin">{t`Jellyfin`}</ToggleGroupItem>
        <ToggleGroupItem value="emby">{t`Emby`}</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  if (isPending) return <HistorySkeleton />;

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  if (allItems.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {header}
        {filterToggles}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconHistory className="text-muted-foreground/40 size-12" />
          <p className="text-muted-foreground mt-4 text-sm">
            <Trans>Nothing watched yet.</Trans>
          </p>
        </div>
      </div>
    );
  }

  // Group by local calendar day, preserving newest-first order.
  const days: { key: string; label: string; items: typeof allItems }[] = [];
  for (const item of allItems) {
    const date = new Date(item.watchedAt);
    const key = formatLocalDate(date);
    const last = days[days.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      days.push({
        key,
        label: formatDate(date, { weekday: "long" }),
        items: [item],
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {header}
      {filterToggles}
      {days.map((day) => (
        <section key={day.key}>
          <h2 className="font-display text-muted-foreground mb-2 text-sm font-medium tracking-wider uppercase">
            {day.label}
          </h2>
          <div className="space-y-2">
            {day.items.map((item) => (
              <HistoryRow key={item.watchId} item={item} />
            ))}
          </div>
        </section>
      ))}
      <div ref={sentinelRef} />
      {isFetchingNextPage && <HistorySkeleton />}
    </div>
  );
}
