"use client";

import { motion } from "motion/react";
import { TitleCard } from "@/components/title-card";

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

export function TitleRow({ heading, icon, items }: TitleRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl tracking-tight">{heading}</h2>
      </div>
      <motion.div
        className="feed-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {items.map((item) => (
          <motion.div
            key={`${item.type}-${item.tmdbId}`}
            variants={staggerItem}
            className="w-[140px] shrink-0 sm:w-[160px]"
          >
            <TitleCard
              tmdbId={item.tmdbId}
              type={item.type}
              title={item.title}
              posterPath={item.posterPath}
              releaseDate={item.releaseDate}
              voteAverage={item.voteAverage}
              href={`/titles/tmdb-${item.tmdbId}-${item.type}`}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
