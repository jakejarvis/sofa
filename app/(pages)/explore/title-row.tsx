"use client";

import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { motion } from "motion/react";
import { ExploreTitleCard } from "@/components/title-card";
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
        <h2 className="font-display text-xl tracking-tight">{heading}</h2>
      </div>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <Carousel
          opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
          plugins={[WheelGesturesPlugin({ forceWheelAxis: "x" })]}
          className="-mx-6 sm:-mx-2 carousel-tilt"
        >
          <CarouselContent className="px-6 sm:px-2">
            {items.map((item) => (
              <CarouselItem
                key={`${item.type}-${item.tmdbId}`}
                className="basis-auto pl-4 w-[140px] shrink-0 sm:w-[160px]"
              >
                <motion.div variants={staggerItem}>
                  <ExploreTitleCard
                    tmdbId={item.tmdbId}
                    type={item.type}
                    title={item.title}
                    posterPath={item.posterPath}
                    releaseDate={item.releaseDate}
                    voteAverage={item.voteAverage}
                    href={`/titles/tmdb-${item.tmdbId}-${item.type}`}
                    userStatus={userStatuses?.[`${item.tmdbId}-${item.type}`]}
                    episodeProgress={
                      episodeProgress?.[`${item.tmdbId}-${item.type}`]
                    }
                  />
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </motion.div>
    </section>
  );
}
