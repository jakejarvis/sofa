"use client";

import { motion } from "motion/react";
import { TitleCard } from "@/components/title-card";

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

interface TitleGridItem {
  id: string;
  tmdbId: number;
  type: string;
  title: string;
  posterPath: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
}

export function TitleGrid({ items }: { items: TitleGridItem[] }) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {items.map((t) => (
        <motion.div key={t.id} variants={staggerItem}>
          <TitleCard
            id={t.id}
            tmdbId={t.tmdbId}
            type={t.type}
            title={t.title}
            posterPath={t.posterPath}
            releaseDate={t.releaseDate}
            voteAverage={t.voteAverage}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
