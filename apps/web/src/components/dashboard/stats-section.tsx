import { Trans } from "@lingui/react/macro";
import { IconDeviceTv } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { orpc } from "@/lib/orpc/client";

import { StatsDisplay, StatsSectionSkeleton } from "./stats-display";

export function StatsSection() {
  const { data: movieStats, isPending: moviesPending } = useQuery(
    orpc.tracking.stats.queryOptions({ input: { type: "movie", period: "this_month" } }),
  );
  const { data: episodeStats, isPending: episodesPending } = useQuery(
    orpc.tracking.stats.queryOptions({ input: { type: "episode", period: "this_week" } }),
  );
  const { data: libraryStats, isPending: libraryPending } = useQuery(
    orpc.library.stats.queryOptions(),
  );

  const isPending = moviesPending || episodesPending || libraryPending;

  if (isPending) return <StatsSectionSkeleton />;
  if (!movieStats || !episodeStats || !libraryStats) return null;

  const isEmpty =
    movieStats.count === 0 &&
    episodeStats.count === 0 &&
    libraryStats.size === 0 &&
    libraryStats.completed === 0;

  return (
    <>
      <StatsDisplay
        movieStats={movieStats}
        episodeStats={episodeStats}
        libraryStats={libraryStats}
      />
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
