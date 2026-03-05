"use client";

import { IconSparkles } from "@tabler/icons-react";
import { motion } from "motion/react";
import { TitleCard } from "@/components/title-card";
import type { RecommendedTitle } from "@/lib/types/title";

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

export function RecommendationsGrid({
  recommendations,
}: {
  recommendations: RecommendedTitle[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <IconSparkles className="size-5 text-primary" />
        <h2 className="font-display text-2xl tracking-tight">Recommended</h2>
      </div>
      <motion.div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {recommendations.slice(0, 12).map((rec) => (
          <motion.div key={rec.id} variants={staggerItem}>
            <TitleCard
              id={rec.id}
              tmdbId={rec.tmdbId}
              type={rec.type}
              title={rec.title}
              posterPath={rec.posterPath}
              releaseDate={rec.releaseDate ?? rec.firstAirDate}
              voteAverage={rec.voteAverage}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
