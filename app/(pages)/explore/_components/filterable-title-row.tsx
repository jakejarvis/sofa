"use client";

import Link from "next/link";
import { useQueryStates } from "nuqs";
import { useState, useTransition } from "react";
import { TitleCardSkeleton } from "@/components/skeletons";
import { TitleCard } from "@/components/title-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { discoverByGenre } from "@/lib/actions/explore";
import {
  fetchEpisodeProgress,
  fetchUserStatuses,
} from "@/lib/actions/watchlist";
import { exploreSearchParams, serializeExploreParams } from "../search-params";

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
  initialGenreItems: TitleRowItem[] | null;
  genres: Genre[];
  userStatuses?: Record<string, TitleStatus>;
  episodeProgress?: Record<string, { watched: number; total: number }>;
}

export function FilterableTitleRow({
  heading,
  icon,
  mediaType,
  defaultItems,
  initialGenreItems,
  genres,
  userStatuses: initialStatuses = {},
  episodeProgress: initialProgress = {},
}: FilterableTitleRowProps) {
  const paramKey = mediaType === "movie" ? "movieGenre" : ("tvGenre" as const);
  const [params, setParams] = useQueryStates(exploreSearchParams, {
    history: "push",
  });
  const selectedGenre = params[paramKey];
  const setSelectedGenre = (value: number | null) =>
    setParams({ [paramKey]: value });

  const [genreResults, setGenreResults] = useState<TitleRowItem[] | null>(
    initialGenreItems,
  );
  const [genreStatuses, setGenreStatuses] = useState<
    Record<string, TitleStatus>
  >(initialGenreItems ? initialStatuses : {});
  const [genreProgress, setGenreProgress] = useState<
    Record<string, { watched: number; total: number }>
  >(initialGenreItems ? initialProgress : {});
  const [isPending, startTransition] = useTransition();

  const items = selectedGenre === null ? defaultItems : (genreResults ?? []);
  const userStatuses = selectedGenre === null ? initialStatuses : genreStatuses;
  const episodeProgress =
    selectedGenre === null ? initialProgress : genreProgress;

  function toggleGenre(genreId: number) {
    if (selectedGenre === genreId) {
      setSelectedGenre(null);
      setGenreResults(null);
      return;
    }

    setSelectedGenre(genreId);
    startTransition(async () => {
      const results = await discoverByGenre(mediaType, genreId);
      setGenreResults(results);

      if (results.length > 0) {
        const lookups = results.map((r) => ({
          tmdbId: r.tmdbId,
          type: r.type,
        }));
        const [statuses, progress] = await Promise.all([
          fetchUserStatuses(lookups),
          fetchEpisodeProgress(lookups),
        ]);
        setGenreStatuses(statuses);
        setGenreProgress(progress);
      } else {
        setGenreStatuses({});
        setGenreProgress({});
      }
    });
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
          {genres.map((genre) => {
            const isSelected = selectedGenre === genre.id;
            const href = serializeExploreParams("/explore", {
              ...params,
              [paramKey]: isSelected ? null : genre.id,
            });
            return (
              <Button
                key={genre.id}
                render={<Link href={href} prefetch={false} />}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  toggleGenre(genre.id);
                }}
                className={`shrink-0 rounded-full ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                }`}
              >
                {genre.name}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Loading skeleton */}
      {(isPending || (selectedGenre !== null && genreResults === null)) && (
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
      {!isPending &&
        selectedGenre !== null &&
        genreResults !== null &&
        items.length === 0 && (
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
