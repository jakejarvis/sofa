"use client";

import { IconSparkles } from "@tabler/icons-react";
import { TitleCard } from "@/components/title-card";
import type { RecommendedTitle } from "@/lib/types/title";

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {recommendations.slice(0, 12).map((rec, i) => (
          <div
            key={rec.id}
            className="animate-stagger-item"
            style={{ "--stagger-index": i } as React.CSSProperties}
          >
            <TitleCard
              id={rec.id}
              tmdbId={rec.tmdbId}
              type={rec.type}
              title={rec.title}
              posterPath={rec.posterPath}
              releaseDate={rec.releaseDate ?? rec.firstAirDate}
              voteAverage={rec.voteAverage}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
