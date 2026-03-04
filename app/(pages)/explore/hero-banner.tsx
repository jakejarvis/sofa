"use client";

import { IconPlus, IconStar } from "@tabler/icons-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

interface HeroBannerProps {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  overview: string;
  backdropPath: string | null;
  voteAverage: number;
}

export function HeroBanner({
  tmdbId,
  type,
  title,
  overview,
  backdropPath,
  voteAverage,
}: HeroBannerProps) {
  const href = `/titles/tmdb-${tmdbId}-${type}`;

  return (
    <motion.div
      className="relative -mt-6 mb-4 ml-[calc(-50vw+50%)] mr-[calc(-50vw+50%)] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="relative w-full min-h-[280px] max-h-[420px] aspect-[21/9]">
        {backdropPath ? (
          <Image
            src={backdropPath}
            alt={title}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-card via-secondary to-muted" />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-4 pb-8 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 24,
                  delay: 0.2,
                }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {type}
                  </span>
                  {voteAverage > 0 && (
                    <span className="flex items-center gap-1 text-sm text-primary">
                      <IconStar size={14} className="fill-primary" />
                      {voteAverage.toFixed(1)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Trending today
                  </span>
                </div>
                <Link href={href} className="group/title">
                  <h2 className="font-display text-3xl tracking-tight sm:text-4xl transition-colors group-hover/title:text-primary">
                    {title}
                  </h2>
                </Link>
                <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                  {overview}
                </p>
                <Link
                  href={href}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:shadow-md hover:shadow-primary/20"
                >
                  <IconPlus size={16} />
                  Add to Library
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
