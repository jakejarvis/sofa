import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
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

export function ContinueWatchingCard({ item }: { item: ContinueWatchingItemProps }) {
  const { t } = useLingui();
  const stillUrl = item.nextEpisode?.stillPath ?? item.title.backdropPath ?? null;
  const progress = item.totalEpisodes > 0 ? (item.watchedEpisodes / item.totalEpisodes) * 100 : 0;

  return (
    <Link
      to="/titles/$id"
      params={{ id: item.title.id }}
      className="group bg-card/50 relative inline-block w-64 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/[0.06] transition-shadow hover:shadow-lg hover:shadow-black/25 sm:w-72"
    >
      <div
        className="bg-muted relative aspect-video overflow-hidden rounded-t-xl"
        style={(() => {
          const hash = item.nextEpisode?.stillThumbHash ?? item.title.backdropThumbHash;
          const url = thumbHashToUrl(hash);
          return url ? { backgroundImage: `url(${url})`, backgroundSize: "cover" } : undefined;
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
          <div className="from-card via-secondary to-muted flex h-full items-center justify-center bg-gradient-to-br">
            <IconPlayerPlay aria-hidden={true} className="text-muted-foreground/30 size-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {item.nextEpisode && (
          <div className="absolute right-3 bottom-2.5 left-3">
            <p className="text-primary flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase">
              <span className="bg-primary inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-pulse" />
              {t`Up next`}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-white">
              <span className="mr-0.5 font-mono text-xs text-white/60 [word-spacing:-0.25em]">
                S{item.nextEpisode.seasonNumber} E{item.nextEpisode.episodeNumber}
              </span>{" "}
              {item.nextEpisode.name}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title.title}</p>
          <p className="text-muted-foreground text-xs">
            {t`${item.watchedEpisodes}/${item.totalEpisodes} ${plural(item.totalEpisodes, { one: "episode", other: "episodes" })}`}
          </p>
        </div>
        <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors">
          <IconPlayerPlay aria-hidden={true} className="size-3.5" />
        </div>
      </div>
      {progress > 0 && (
        <div className="bg-muted absolute right-0 bottom-0 left-0 h-0.5">
          <div className="bg-primary h-full transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Link>
  );
}
