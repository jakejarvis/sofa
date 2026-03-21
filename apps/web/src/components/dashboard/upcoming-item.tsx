import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconMovie } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { thumbHashToUrl } from "@/lib/thumbhash";
import type { UpcomingItem } from "@sofa/api/schemas";
import { formatDate } from "@sofa/i18n/format";

const statusColorClass = {
  in_watchlist: "bg-status-watchlist",
  watching: "bg-status-watching",
  caught_up: "bg-status-completed",
  completed: "bg-status-completed",
} as const;

function formatShortDate(dateStr: string): string {
  return formatDate(dateStr, { month: "short", day: "numeric" });
}

export function UpcomingRow({ item }: { item: UpcomingItem }) {
  const { t } = useLingui();

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
      className="group flex items-center gap-3.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
    >
      {/* Poster thumbnail */}
      <div className="relative size-[52px] shrink-0 overflow-hidden rounded-md ring-1 ring-white/[0.06]">
        {item.posterPath ? (
          <img
            src={item.posterPath}
            alt=""
            className="size-full object-cover"
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
          <span className="truncate text-sm font-medium">{item.titleName}</span>
          {item.isNewSeason && (
            <span className="bg-primary/15 text-primary shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
              {t`New Season`}
            </span>
          )}
        </div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
          {item.titleType === "movie" && <IconMovie className="size-3 shrink-0" />}
          <span className="truncate">{subtitle}</span>
          {item.streamingProvider && (
            <>
              <span className="text-muted-foreground/40">&middot;</span>
              <span className="shrink-0">{item.streamingProvider.providerName}</span>
            </>
          )}
        </div>
      </div>

      {/* Status dot + date on right */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`size-2 rounded-full ${statusColorClass[item.userStatus]}`} />
        <span className="text-muted-foreground/60 text-[10px] font-medium">
          {formatShortDate(item.date)}
        </span>
      </div>
    </Link>
  );
}
