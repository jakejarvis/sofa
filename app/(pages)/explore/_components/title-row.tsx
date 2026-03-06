"use client";

import { TitleCard } from "@/components/title-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface TitleRowItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

interface TitleRowProps {
  heading: string;
  icon: React.ReactNode;
  items: TitleRowItem[];
  userStatuses?: Record<string, "watchlist" | "in_progress" | "completed">;
  episodeProgress?: Record<string, { watched: number; total: number }>;
}

export function TitleRow({
  heading,
  icon,
  items,
  userStatuses,
  episodeProgress,
}: TitleRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl tracking-tight text-balance">
          {heading}
        </h2>
      </div>
      <Carousel
        opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
        className="-mx-6 sm:-mx-2 carousel-tilt"
      >
        <CarouselContent className="px-6 sm:px-2">
          {items.map((item, i) => (
            <CarouselItem
              key={`${item.type}-${item.tmdbId}`}
              className="basis-auto pl-4 w-[140px] shrink-0 sm:w-[160px]"
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
                  userStatus={userStatuses?.[`${item.tmdbId}-${item.type}`]}
                  episodeProgress={
                    episodeProgress?.[`${item.tmdbId}-${item.type}`]
                  }
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
