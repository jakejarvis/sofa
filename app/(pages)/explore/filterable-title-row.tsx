"use client";

import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { createStore, Provider, useAtom, useAtomValue } from "jotai";
import { useState } from "react";
import { TitleCardSkeleton } from "@/components/skeletons";
import { ExploreTitleCard } from "@/components/title-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  defaultItemsAtom,
  genreEnrichmentsAtom,
  genreResultsAtom,
  initialEpisodeProgressAtom,
  initialUserStatusesAtom,
  mediaTypeAtom,
  selectedGenreAtom,
} from "@/lib/atoms/filterable-row";

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

interface FilterableTitleRowProps {
  heading: string;
  icon: React.ReactNode;
  mediaType: "movie" | "tv";
  defaultItems: TitleRowItem[];
  genres: Genre[];
  userStatuses?: Record<string, "watchlist" | "in_progress" | "completed">;
  episodeProgress?: Record<string, { watched: number; total: number }>;
}

export function FilterableTitleRow({
  heading,
  icon,
  mediaType,
  defaultItems,
  genres,
  userStatuses,
  episodeProgress,
}: FilterableTitleRowProps) {
  const [store] = useState(() => {
    const s = createStore();
    s.set(mediaTypeAtom, mediaType);
    s.set(defaultItemsAtom, defaultItems);
    s.set(initialUserStatusesAtom, userStatuses ?? {});
    s.set(initialEpisodeProgressAtom, episodeProgress ?? {});
    return s;
  });

  return (
    <Provider store={store}>
      <FilterableTitleRowInner heading={heading} icon={icon} genres={genres} />
    </Provider>
  );
}

function FilterableTitleRowInner({
  heading,
  icon,
  genres,
}: {
  heading: string;
  icon: React.ReactNode;
  genres: Genre[];
}) {
  const [selectedGenre, setSelectedGenre] = useAtom(selectedGenreAtom);
  const defaults = useAtomValue(defaultItemsAtom);
  const genreResults = useAtomValue(genreResultsAtom);
  const initialStatuses = useAtomValue(initialUserStatusesAtom);
  const initialProgress = useAtomValue(initialEpisodeProgressAtom);
  const genreEnrichments = useAtomValue(genreEnrichmentsAtom);

  const loading = selectedGenre !== null && genreResults === undefined;
  const items = selectedGenre === null ? defaults : (genreResults ?? []);

  const userStatuses =
    selectedGenre === null
      ? initialStatuses
      : (genreEnrichments?.statuses ?? initialStatuses);

  const episodeProgress =
    selectedGenre === null
      ? initialProgress
      : (genreEnrichments?.progress ?? initialProgress);

  function toggleGenre(genreId: number) {
    setSelectedGenre(selectedGenre === genreId ? null : genreId);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl tracking-tight">{heading}</h2>
      </div>

      {/* Genre chips */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-0 sm:flex-wrap sm:px-0">
        {genres.map((genre) => (
          <button
            key={genre.id}
            type="button"
            onClick={() => toggleGenre(genre.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
              selectedGenre === genre.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/20 hover:text-foreground"
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
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
      {!loading && selectedGenre !== null && items.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No titles found for this genre.
        </p>
      )}

      {/* Carousel */}
      {!loading && items.length > 0 && (
        <div key={selectedGenre ?? "default"}>
          <Carousel
            opts={{
              align: "start",
              dragFree: true,
              containScroll: "trimSnaps",
            }}
            plugins={[WheelGesturesPlugin({ forceWheelAxis: "x" })]}
            className="-mx-6 sm:-mx-2 carousel-tilt"
          >
            <CarouselContent className="px-6 sm:px-2">
              {items.slice(0, 20).map((item, i) => (
                <CarouselItem
                  key={`${item.type}-${item.tmdbId}`}
                  className="basis-auto pl-4 w-[140px] shrink-0 sm:w-[160px]"
                >
                  <div
                    className="animate-stagger-item"
                    style={{ "--stagger-index": i } as React.CSSProperties}
                  >
                    <ExploreTitleCard
                      tmdbId={item.tmdbId}
                      type={item.type}
                      title={item.title}
                      posterPath={item.posterPath}
                      releaseDate={item.releaseDate}
                      voteAverage={item.voteAverage}
                      href={`/titles/tmdb-${item.tmdbId}-${item.type}`}
                      userStatus={userStatuses[`${item.tmdbId}-${item.type}`]}
                      episodeProgress={
                        episodeProgress[`${item.tmdbId}-${item.type}`]
                      }
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      )}
    </section>
  );
}
