import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconMovie } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { thumbHashToUrl } from "@/lib/thumbhash";
import type { UpcomingItem } from "@sofa/api/schemas";

const statusColorClass = {
  in_watchlist: "bg-status-watchlist",
  watching: "bg-status-watching",
  caught_up: "bg-status-completed",
  completed: "bg-status-completed",
} as const;

const statusHaloClass = statusColorClass;

function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function UpcomingRow({ item }: { item: UpcomingItem }) {
  const { t } = useLingui();

  const statusLabels = {
    in_watchlist: t`On Watchlist`,
    watching: t`Watching`,
    caught_up: t`Caught Up`,
    completed: t`Completed`,
  } as const;

  let subtitle: string;
  if (item.titleType === "movie") {
    subtitle = formatShortDate(item.date);
  } else if (item.episodeCount > 1 && item.seasonNumber != null) {
    const seasonNum = item.seasonNumber;
    const epCount = item.episodeCount;
    subtitle = t`S${seasonNum} \u00b7 ${plural(epCount, { one: "# episode", other: "# episodes" })}`;
  } else {
    const episodeLabel =
      item.seasonNumber != null && item.episodeNumber != null
        ? `S${item.seasonNumber}E${item.episodeNumber}`
        : null;
    subtitle = [episodeLabel, item.episodeName].filter(Boolean).join(" \u00b7 ");
  }

  return (
    <Link
      to="/titles/$id"
      params={{ id: item.titleId }}
      className="group bg-card/40 hover:bg-card/60 hover:shadow-primary/5 hover:ring-primary/25 flex items-center gap-4 rounded-xl px-3 py-3 ring-1 ring-white/[0.06] transition-[background,box-shadow,ring-color] duration-200 hover:shadow-lg"
    >
      {/* Poster */}
      <div className="relative h-[66px] w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/[0.06]">
        {item.posterPath ? (
          <img
            src={item.posterPath}
            alt=""
            className="size-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
            loading="lazy"
            {...(item.posterThumbHash
              ? {
                  style: {
                    background: `url(${thumbHashToUrl(item.posterThumbHash)}) center/cover`,
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

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger className="relative flex size-2 shrink-0">
              <span
                className={`absolute inline-flex size-full rounded-full opacity-40 motion-safe:animate-pulse ${statusHaloClass[item.userStatus]}`}
              />
              <span
                className={`relative inline-flex size-2 rounded-full ${statusColorClass[item.userStatus]}`}
              />
            </TooltipTrigger>
            <TooltipContent side="top">{statusLabels[item.userStatus]}</TooltipContent>
          </Tooltip>
          <span className="truncate text-sm font-medium">{item.titleName}</span>
          {item.isNewSeason && (
            <span className="bg-primary/15 text-primary shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
              {t`New Season`}
            </span>
          )}
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          {item.titleType === "movie" && <IconMovie className="size-3 shrink-0" />}
          <span className="truncate">{subtitle}</span>
        </div>
      </div>

      {/* Right column: date + provider logo */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-muted-foreground text-xs">{formatShortDate(item.date)}</span>
        {item.streamingProvider && (
          <Tooltip>
            <TooltipTrigger className="shrink-0">
              {item.streamingProvider.logoPath ? (
                <img
                  src={item.streamingProvider.logoPath}
                  alt={item.streamingProvider.providerName}
                  className="size-7 rounded-lg ring-1 ring-white/[0.06]"
                />
              ) : (
                <span className="text-muted-foreground/60 text-[10px]">
                  {item.streamingProvider.providerName}
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="top">{item.streamingProvider.providerName}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </Link>
  );
}
