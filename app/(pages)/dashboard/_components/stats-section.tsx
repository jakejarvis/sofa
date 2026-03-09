"use client";

import { IconDeviceTv } from "@tabler/icons-react";
import Link from "next/link";
import { StatsSectionSkeleton } from "@/components/skeletons";
import { useDashboardStats } from "@/lib/queries/dashboard";
import { StatsDisplay } from "./stats-display";

export function StatsSection() {
  const { data: stats, isPending } = useDashboardStats();

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
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border/50 border-dashed py-16 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <IconDeviceTv aria-hidden={true} className="size-8 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Your library is empty</p>
            <p className="text-muted-foreground text-sm">
              Search for movies and TV shows to start tracking
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground text-sm transition-shadow hover:shadow-md hover:shadow-primary/20"
          >
            Start exploring
          </Link>
        </div>
      )}
    </>
  );
}
