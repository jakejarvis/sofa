"use client";

import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { TitleCardSkeleton } from "@/components/skeletons";
import { TitleCard } from "@/components/title-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

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
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export function FilterableTitleRow({
  heading,
  icon,
  mediaType,
  defaultItems,
  genres,
}: FilterableTitleRowProps) {
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [results, setResults] = useState<TitleRowItem[]>([]);
  const [loading, setLoading] = useState(false);

  const items = selectedGenre === null ? defaultItems : results;

  useEffect(() => {
    if (selectedGenre === null) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(
      `/api/explore/discover?type=${mediaType}&genre=${selectedGenre}&sort_by=popularity.desc`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setResults(data.results ?? []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGenre, mediaType]);

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
      <div className="feed-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-0 sm:flex-wrap sm:px-0">
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
        <motion.div
          key={selectedGenre ?? "default"}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <Carousel
            opts={{
              align: "start",
              dragFree: true,
              containScroll: "trimSnaps",
            }}
            plugins={[WheelGesturesPlugin({ forceWheelAxis: "x" })]}
            className="-mx-4 sm:-mx-0"
          >
            <CarouselContent className="px-4 sm:px-0">
              {items.slice(0, 20).map((item) => (
                <CarouselItem
                  key={`${item.type}-${item.tmdbId}`}
                  className="basis-auto pl-4 w-[140px] shrink-0 sm:w-[160px]"
                >
                  <motion.div variants={staggerItem}>
                    <TitleCard
                      tmdbId={item.tmdbId}
                      type={item.type}
                      title={item.title}
                      posterPath={item.posterPath}
                      releaseDate={item.releaseDate}
                      voteAverage={item.voteAverage}
                      href={`/titles/tmdb-${item.tmdbId}-${item.type}`}
                      showQuickAdd
                    />
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </motion.div>
      )}
    </section>
  );
}
