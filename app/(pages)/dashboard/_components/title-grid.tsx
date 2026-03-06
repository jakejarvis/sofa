"use client";

import { TitleCard } from "@/components/title-card";

interface TitleGridItem {
  id: string;
  tmdbId: number;
  type: string;
  title: string;
  posterPath: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  userStatus?: "watchlist" | "in_progress" | "completed" | null;
}

export function TitleGrid({ items }: { items: TitleGridItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((t, i) => (
        <div
          key={t.id}
          className="animate-stagger-item"
          style={{ "--stagger-index": i } as React.CSSProperties}
        >
          <TitleCard
            id={t.id}
            tmdbId={t.tmdbId}
            type={t.type}
            title={t.title}
            posterPath={t.posterPath}
            releaseDate={t.releaseDate}
            voteAverage={t.voteAverage}
            userStatus={t.userStatus}
          />
        </div>
      ))}
    </div>
  );
}
