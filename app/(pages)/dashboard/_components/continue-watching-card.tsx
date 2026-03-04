"use client";

import { IconPlayerPlay } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

export interface ContinueWatchingItemProps {
  title: {
    id: string;
    title: string;
    backdropPath: string | null;
  };
  nextEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
    stillPath: string | null;
  } | null;
  totalEpisodes: number;
  watchedEpisodes: number;
}

export function ContinueWatchingCard({
  item,
}: {
  item: ContinueWatchingItemProps;
}) {
  const stillUrl =
    item.nextEpisode?.stillPath ?? item.title.backdropPath ?? null;
  const progress =
    item.totalEpisodes > 0
      ? (item.watchedEpisodes / item.totalEpisodes) * 100
      : 0;

  return (
    <Link
      href={`/titles/${item.title.id}`}
      className="group relative w-[calc(100vw-3rem)] shrink-0 overflow-hidden rounded-xl bg-card/50 ring-1 ring-white/[0.06] transition-shadow hover:shadow-lg hover:shadow-black/25 sm:w-72"
    >
      <div className="relative aspect-video overflow-hidden rounded-t-xl bg-muted">
        {stillUrl ? (
          <Image
            src={stillUrl}
            alt={item.nextEpisode?.name ?? item.title.title}
            width={500}
            height={281}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-card via-secondary to-muted">
            <IconPlayerPlay className="size-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {item.nextEpisode && (
          <div className="absolute bottom-2.5 left-3 right-3">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Up next
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-white">
              <span className="font-mono text-xs text-white/60 [word-spacing:-0.25em] mr-0.5">
                S{item.nextEpisode.seasonNumber} E
                {item.nextEpisode.episodeNumber}
              </span>{" "}
              {item.nextEpisode.name}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.watchedEpisodes}/{item.totalEpisodes} episodes
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <IconPlayerPlay className="size-3.5" />
        </div>
      </div>
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Link>
  );
}
