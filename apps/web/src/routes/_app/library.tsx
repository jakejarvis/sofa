import { useLingui } from "@lingui/react/macro";
import { IconBooks, IconFilterOff } from "@tabler/icons-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { TitleGrid, TitleGridSectionSkeleton } from "@/components/dashboard/title-grid";
import { LibraryToolbar } from "@/components/library/library-toolbar";
import { RouteError } from "@/components/route-error";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { orpc } from "@/lib/orpc/client";

const librarySearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  statuses: z.array(z.string()).optional().catch(undefined),
  type: z.enum(["movie", "tv"]).optional().catch(undefined),
  genreId: z.number().optional().catch(undefined),
  ratingMin: z.number().optional().catch(undefined),
  ratingMax: z.number().optional().catch(undefined),
  yearMin: z.number().optional().catch(undefined),
  yearMax: z.number().optional().catch(undefined),
  contentRating: z.string().optional().catch(undefined),
  availableToStream: z.boolean().optional().catch(undefined),
  sortBy: z.string().optional().catch(undefined),
  sortDirection: z.enum(["asc", "desc"]).optional().catch(undefined),
});

type LibrarySearch = z.infer<typeof librarySearchSchema>;

export const Route = createFileRoute("/_app/library")({
  validateSearch: zodValidator(librarySearchSchema),
  staleTime: 30_000,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        orpc.library.list.infiniteOptions({
          input: (pageParam: number) => ({ page: pageParam }),
          initialPageParam: 1,
          getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
          maxPages: 10,
        }),
      ),
      context.queryClient.ensureQueryData(orpc.library.genres.queryOptions()),
    ]);
  },
  head: () => ({ meta: [{ title: "Library — Sofa" }] }),
  pendingComponent: LibrarySkeleton,
  errorComponent: RouteError,
  component: LibraryPage,
});

function LibrarySkeleton() {
  return (
    <div className="space-y-6">
      <TitleGridSectionSkeleton />
      <TitleGridSectionSkeleton />
    </div>
  );
}

function LibraryPage() {
  const { t } = useLingui();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Debounced search — update URL 300ms after the user stops typing
  const [localSearch, setLocalSearch] = useState(search.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync localSearch when URL params change externally (back/forward navigation)
  useEffect(() => {
    setLocalSearch(search.search ?? "");
  }, [search.search]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateSearch = useCallback(
    (updates: Partial<LibrarySearch>) => {
      void navigate({
        search: (prev) => {
          const next = { ...prev, ...updates };
          // Remove undefined/empty values
          for (const [key, value] of Object.entries(next)) {
            if (
              value === undefined ||
              value === "" ||
              (Array.isArray(value) && value.length === 0)
            ) {
              delete (next as Record<string, unknown>)[key];
            }
          }
          return next;
        },
        replace: true,
      });
    },
    [navigate],
  );

  const handleFilterChange = useCallback(
    (key: string, value: unknown) => {
      updateSearch({ [key]: value || undefined });
    },
    [updateSearch],
  );

  const handleClearAll = useCallback(() => {
    setLocalSearch("");
    void navigate({ search: {}, replace: true });
  }, [navigate]);

  const handleSortChange = useCallback(
    (sortBy: string, sortDirection: string) => {
      updateSearch({ sortBy, sortDirection: sortDirection as "asc" | "desc" });
    },
    [updateSearch],
  );

  // Build input from search params
  const queryInput = useMemo(() => {
    const input: Record<string, unknown> = {};
    if (search.search) input.search = search.search;
    if (search.statuses?.length) input.statuses = search.statuses;
    if (search.type) input.type = search.type;
    if (search.genreId) input.genreId = search.genreId;
    if (search.ratingMin) input.ratingMin = search.ratingMin;
    if (search.ratingMax) input.ratingMax = search.ratingMax;
    if (search.yearMin) input.yearMin = search.yearMin;
    if (search.yearMax) input.yearMax = search.yearMax;
    if (search.contentRating) input.contentRating = search.contentRating;
    if (search.availableToStream) input.availableToStream = true;
    if (search.sortBy) input.sortBy = search.sortBy;
    if (search.sortDirection) input.sortDirection = search.sortDirection;
    return input;
  }, [search]);

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(
    orpc.library.list.infiniteOptions({
      input: (pageParam: number) => ({ ...queryInput, page: pageParam }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      maxPages: 10,
    }),
  );

  const sentinelRef = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const totalResults = data?.pages[0]?.totalResults ?? 0;

  // Count active filters (excluding sort)
  const activeFilterCount = [
    search.statuses?.length ? 1 : 0,
    search.type ? 1 : 0,
    search.genreId ? 1 : 0,
    search.ratingMin || search.ratingMax ? 1 : 0,
    search.yearMin || search.yearMax ? 1 : 0,
    search.contentRating ? 1 : 0,
    search.availableToStream ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <IconBooks aria-hidden={true} className="text-primary size-5" />
        <h1 className="font-display text-xl tracking-tight">{t`Library`}</h1>
      </div>

      <LibraryToolbar
        search={localSearch}
        onSearchChange={(value: string) => {
          setLocalSearch(value);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            updateSearch({ search: value || undefined });
          }, 300);
        }}
        filters={{
          statuses: search.statuses,
          type: search.type,
          genreId: search.genreId,
          ratingMin: search.ratingMin,
          ratingMax: search.ratingMax,
          yearMin: search.yearMin,
          yearMax: search.yearMax,
          contentRating: search.contentRating,
          availableToStream: search.availableToStream,
        }}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        sortBy={search.sortBy ?? "added_at"}
        sortDirection={search.sortDirection ?? "desc"}
        onSortChange={handleSortChange}
        totalResults={totalResults}
        activeFilterCount={activeFilterCount}
      />

      {isPending ? (
        <TitleGridSectionSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <IconFilterOff className="text-muted-foreground/40 size-12" />
          <p className="text-muted-foreground text-lg">{t`No titles match your filters`}</p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-primary text-sm hover:underline"
            >
              {t`Clear all filters`}
            </button>
          )}
        </div>
      ) : (
        <>
          <TitleGrid items={items} />
          <div ref={sentinelRef} />
          {isFetchingNextPage && <TitleGridSectionSkeleton />}
        </>
      )}
    </div>
  );
}
