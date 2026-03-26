import { Trans } from "@lingui/react/macro";
import { IconDeviceTv } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { orpc } from "@/lib/orpc/client";

import { StatsDisplay, StatsSectionSkeleton } from "./stats-display";

export function StatsSection() {
  const { data: stats, isPending } = useQuery(orpc.tracking.stats.queryOptions());

  if (isPending) return <StatsSectionSkeleton />;
  if (!stats) return null;

  const isEmpty =
    stats.moviesThisMonth === 0 &&
    stats.episodesThisWeek === 0 &&
    stats.librarySize === 0 &&
    stats.completed === 0;

  return (
    <>
      <StatsDisplay stats={stats} />
      {isEmpty && (
        <div className="border-border/50 flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <div className="bg-primary/10 rounded-full p-4">
            <IconDeviceTv aria-hidden={true} className="text-primary size-8" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              <Trans>Your library is empty</Trans>
            </p>
            <p className="text-muted-foreground text-sm">
              <Trans>Search for movies and TV shows to start tracking</Trans>
            </p>
          </div>
          <Link
            to="/explore"
            className="bg-primary text-primary-foreground hover:shadow-primary/20 inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium transition-shadow hover:shadow-md"
          >
            <Trans>Start exploring</Trans>
          </Link>
        </div>
      )}
    </>
  );
}
