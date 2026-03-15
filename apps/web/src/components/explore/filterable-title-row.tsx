import { skipToken, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { TitleCard, TitleCardSkeleton } from "@/components/title-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { hasReachedHorizontalEnd } from "@/hooks/use-infinite-scroll";
import { orpc } from "@/lib/orpc/client";

interface Genre {
  id: number;
  name: string;
}

interface TitleRowItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  posterThumbHash?: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  voteAverage: number | null;
}

type TitleStatus = "watchlist" | "in_progress" | "completed";

interface FilterableTitleRowProps {
  heading: string;
  icon: React.ReactNode;
  mediaType: "movie" | "tv";
  defaultItems: TitleRowItem[];
  genres: Genre[];
  userStatuses?: Record<string, TitleStatus>;
  episodeProgress?: Record<string, { watched: number; total: number }>;
}

export function FilterableTitleRow({
  heading,
  icon,
  mediaType,
  defaultItems,
  genres,
  userStatuses: initialStatuses = {},
  episodeProgress: initialProgress = {},
}: FilterableTitleRowProps) {
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    data: discoverData,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    orpc.discover.infiniteOptions({
      input:
        selectedGenre != null
          ? (pageParam: number) => ({
              type: mediaType,
              genreId: selectedGenre,
              page: pageParam,
            })
          : skipToken,
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    }),
  );

  const discoverItems = useMemo(
    () => discoverData?.pages.flatMap((p) => p.items) ?? [],
    [discoverData?.pages],
  );
  const discoverStatuses = useMemo(
    () =>
      Object.assign(
        {},
        ...(discoverData?.pages.map((p) => p.userStatuses) ?? []),
      ) as Record<string, TitleStatus>,
    [discoverData?.pages],
  );
  const discoverProgress = useMemo(
    () =>
      Object.assign(
        {},
        ...(discoverData?.pages.map((p) => p.episodeProgress) ?? []),
      ) as Record<string, { watched: number; total: number }>,
    [discoverData?.pages],
  );

  const isLoading = selectedGenre !== null && isPending;
  const items = selectedGenre === null ? defaultItems : discoverItems;
  const userStatuses =
    selectedGenre === null ? initialStatuses : discoverStatuses;
  const episodeProgress =
    selectedGenre === null ? initialProgress : discoverProgress;

  function toggleGenre(genreId: number) {
    setSelectedGenre(genreId === selectedGenre ? null : genreId);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-balance font-display text-xl tracking-tight">
          {heading}
        </h2>
      </div>

      {/* Genre chips */}
      <ScrollArea scrollFade hideScrollbar>
        <div className="flex gap-2">
          {genres.map((genre) => (
            <Button
              key={genre.id}
              variant={selectedGenre === genre.id ? "default" : "outline"}
              size="sm"
              onClick={() => toggleGenre(genre.id)}
              className={`shrink-0 rounded-full ${
                selectedGenre === genre.id
                  ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/20 hover:text-foreground"
              }`}
            >
              {genre.name}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:-mx-0 sm:px-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              key={`skel-${i}`}
              className="w-[140px] shrink-0 sm:w-[160px]"
            >
              <TitleCardSkeleton />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && selectedGenre !== null && items.length === 0 && (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No titles found for this genre.
        </p>
      )}

      {/* Title cards */}
      {!isLoading && items.length > 0 && (
        <ScrollArea
          key={selectedGenre ?? "default"}
          scrollFade
          hideScrollbar
          className="-mx-6 sm:-mx-2"
          scrollRef={scrollRef}
          onScrollEnd={() => {
            const viewport = scrollRef.current;

            if (
              selectedGenre === null ||
              !viewport ||
              !hasNextPage ||
              isFetchingNextPage ||
              !hasReachedHorizontalEnd(viewport)
            ) {
              return;
            }

            fetchNextPage();
          }}
        >
          <div className="flex gap-4 px-6 py-2 sm:px-2">
            {items.map((item: TitleRowItem, i: number) => (
              <div
                key={`${item.type}-${item.tmdbId}`}
                className="w-[140px] shrink-0 sm:w-[160px]"
              >
                <div
                  className="animate-stagger-item"
                  style={{ "--stagger-index": i } as React.CSSProperties}
                >
                  <TitleCard
                    tmdbId={item.tmdbId}
                    type={item.type}
                    title={item.title}
                    posterPath={item.posterPath}
                    posterThumbHash={item.posterThumbHash}
                    releaseDate={item.releaseDate ?? item.firstAirDate}
                    voteAverage={item.voteAverage}
                    userStatus={userStatuses[`${item.tmdbId}-${item.type}`]}
                    episodeProgress={
                      episodeProgress[`${item.tmdbId}-${item.type}`]
                    }
                  />
                </div>
              </div>
            ))}
            {isFetchingNextPage && (
              <div className="flex shrink-0 items-center px-4">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
