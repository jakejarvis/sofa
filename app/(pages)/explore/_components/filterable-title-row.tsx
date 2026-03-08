"use client";

import { useState } from "react";
import { TitleCardSkeleton } from "@/components/skeletons";
import { TitleCard } from "@/components/title-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDiscover } from "@/hooks/use-discover";

interface Genre {
  id: number;
  name: string;
}

interface TitleRowItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
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
  const { data: discoverData, isLoading: isPending } = useDiscover(
    mediaType,
    selectedGenre,
  );

  const items =
    selectedGenre === null ? defaultItems : (discoverData?.items ?? []);
  const userStatuses =
    selectedGenre === null
      ? initialStatuses
      : (discoverData?.userStatuses ?? {});
  const episodeProgress =
    selectedGenre === null
      ? initialProgress
      : (discoverData?.episodeProgress ?? {});

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
      {isPending && (
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
      {!isPending && selectedGenre !== null && items.length === 0 && (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No titles found for this genre.
        </p>
      )}

      {/* Title cards */}
      {!isPending && items.length > 0 && (
        <ScrollArea
          key={selectedGenre ?? "default"}
          scrollFade
          hideScrollbar
          className="-mx-6 sm:-mx-2"
        >
          <div className="flex gap-4 px-6 py-2 sm:px-2">
            {items.slice(0, 20).map((item, i) => (
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
                    releaseDate={item.releaseDate}
                    voteAverage={item.voteAverage}
                    userStatus={userStatuses[`${item.tmdbId}-${item.type}`]}
                    episodeProgress={
                      episodeProgress[`${item.tmdbId}-${item.type}`]
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
