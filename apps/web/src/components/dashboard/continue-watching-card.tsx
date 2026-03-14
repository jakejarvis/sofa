import { IconPlayerPlay } from "@tabler/icons-react";

import { Link } from "@tanstack/react-router";
import { thumbHashToUrl } from "@/lib/thumbhash";

export interface ContinueWatchingItemProps {
  title: {
    id: string;
    title: string;
    backdropPath: string | null;
    backdropThumbHash?: string | null;
  };
  nextEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
    stillPath: string | null;
    stillThumbHash?: string | null;
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
      to="/titles/$id"
      params={{ id: item.title.id }}
      className="group relative inline-block w-64 shrink-0 overflow-hidden rounded-xl bg-card/50 ring-1 ring-white/[0.06] transition-shadow hover:shadow-black/25 hover:shadow-lg sm:w-72"
    >
      <div
        className="relative aspect-video overflow-hidden rounded-t-xl bg-muted"
        style={(() => {
          const hash =
            item.nextEpisode?.stillThumbHash ?? item.title.backdropThumbHash;
          const url = thumbHashToUrl(hash);
          return url
            ? { backgroundImage: `url(${url})`, backgroundSize: "cover" }
            : undefined;
        })()}
      >
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={item.nextEpisode?.name ?? item.title.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-card via-secondary to-muted">
            <IconPlayerPlay
              aria-hidden={true}
              className="size-8 text-muted-foreground/30"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {item.nextEpisode && (
          <div className="absolute right-3 bottom-2.5 left-3">
            <p className="flex items-center gap-1.5 font-medium text-[10px] text-primary uppercase tracking-wider">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
              Up next
            </p>
            <p className="mt-0.5 truncate font-medium text-sm text-white">
              <span className="mr-0.5 font-mono text-white/60 text-xs [word-spacing:-0.25em]">
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
          <p className="truncate font-medium text-sm">{item.title.title}</p>
          <p className="text-muted-foreground text-xs">
            {item.watchedEpisodes}/{item.totalEpisodes} episodes
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <IconPlayerPlay aria-hidden={true} className="size-3.5" />
        </div>
      </div>
      {progress > 0 && (
        <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Link>
  );
}
