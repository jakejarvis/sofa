import { useLingui } from "@lingui/react/macro";
import { IconMovie } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { z } from "zod";

import { thumbHashToUrl } from "@/lib/thumbhash";
import type { WatchHistoryItemSchema } from "@sofa/api/schemas";
import { formatDate } from "@sofa/i18n/format";

type WatchHistoryItem = z.infer<typeof WatchHistoryItemSchema>;

export function HistoryRow({ item }: { item: WatchHistoryItem }) {
  const { t } = useLingui();

  const sourceLabels = {
    manual: t`Manual`,
    import: t`Import`,
    plex: t`Plex`,
    jellyfin: t`Jellyfin`,
    emby: t`Emby`,
  } as const;

  let subtitle: string | null = null;
  if (item.episode) {
    const season = item.episode.seasonNumber;
    const episode = item.episode.episodeNumber;
    const name = item.episode.name;
    subtitle = name ? t`S${season} E${episode} · ${name}` : t`S${season} E${episode}`;
  }

  const time = formatDate(item.watchedAt, {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Link
      to="/titles/$id"
      params={{ id: item.title.id }}
      className="group bg-card/40 hover:bg-card/60 hover:ring-primary/25 flex items-center gap-4 rounded-xl p-3 ring-1 ring-white/[0.06] transition-[background,ring-color] duration-200"
    >
      <div className="relative h-[66px] w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/[0.06]">
        {item.title.posterPath ? (
          <img
            src={item.title.posterPath}
            alt=""
            className="size-full object-cover"
            loading="lazy"
            {...(item.title.posterThumbHash
              ? {
                  style: {
                    background: `url(${thumbHashToUrl(item.title.posterThumbHash)}) center/cover`,
                  },
                }
              : {})}
          />
        ) : (
          <div className="bg-muted flex size-full items-center justify-center">
            <IconMovie className="text-muted-foreground size-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.title.title}</div>
        {subtitle && <div className="text-muted-foreground mt-1 truncate text-xs">{subtitle}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-muted-foreground text-xs tabular-nums">{time}</span>
        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wider uppercase">
          {sourceLabels[item.source]}
        </span>
      </div>
    </Link>
  );
}
