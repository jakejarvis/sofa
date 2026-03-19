import { Trans, useLingui } from "@lingui/react/macro";
import { IconBooks, IconCheck, IconDeviceTvOld, IconMovie } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";
import type { DashboardStats, HistoryBucket, TimePeriod } from "@sofa/api/schemas";

import { Sparkline } from "./sparkline";

function StatCardSkeleton() {
  return (
    <div className="border-border/30 bg-card/50 overflow-hidden rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-md" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-2 h-7 w-12" />
    </div>
  );
}

export function StatsSectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}

const periods: TimePeriod[] = ["today", "this_week", "this_month", "this_year"];

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  value: number;
  index: number;
  label: React.ReactNode;
  loading?: boolean;
  sparklineData?: HistoryBucket[];
}

function StatCard({
  icon: Icon,
  color,
  bgColor,
  value,
  index,
  label,
  sparklineData,
}: StatCardProps) {
  return (
    <div
      className="animate-stagger-item border-border/30 bg-card/50 relative overflow-hidden rounded-xl border p-4"
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      {sparklineData && <Sparkline data={sparklineData} color={color} />}
      <div className="relative z-10 flex items-center gap-2">
        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${bgColor}`}>
          <Icon aria-hidden={true} className={`size-[13px] ${color}`} />
        </div>
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {label}
        </span>
      </div>
      <p
        suppressHydrationWarning
        className={`font-display relative z-10 mt-2 text-2xl tracking-tight tabular-nums ${color} motion-safe:transition-opacity motion-safe:duration-300`}
      >
        {value}
      </p>
    </div>
  );
}

const inlineTriggerClass =
  "h-auto w-auto gap-0.5 rounded-none border-0 bg-transparent py-1 px-0.5 -my-1 -mx-0.5 sm:p-0 sm:m-0 [font-size:inherit] [line-height:inherit] shadow-none underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 hover:bg-transparent hover:text-foreground hover:decoration-foreground/50 focus-visible:ring-0 focus-visible:decoration-solid focus-visible:decoration-foreground dark:bg-transparent dark:hover:bg-transparent";

function PeriodSelect({
  period,
  onPeriodChange,
  periodLabels,
}: {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  periodLabels: Record<TimePeriod, string>;
}) {
  return (
    <Select
      value={period}
      onValueChange={(v) => v && onPeriodChange(v as TimePeriod)}
      modal={false}
    >
      <SelectTrigger className={`${inlineTriggerClass} text-foreground/80 uppercase`}>
        <SelectValue>
          {(value: TimePeriod | null) => (value ? periodLabels[value] : null)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className="p-1">
        {periods.map((p) => (
          <SelectItem key={p} value={p}>
            {periodLabels[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PeriodSelector({
  type,
  period,
  onPeriodChange,
}: {
  type: "movies" | "episodes";
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}) {
  const { t } = useLingui();
  const periodLabels: Record<TimePeriod, string> = {
    today: t`Today`,
    this_week: t`This Week`,
    this_month: t`This Month`,
    this_year: t`This Year`,
  };

  const select = (
    <PeriodSelect
      key="select"
      period={period}
      onPeriodChange={onPeriodChange}
      periodLabels={periodLabels}
    />
  );

  return (
    <span className="inline-flex items-baseline gap-1">
      {type === "movies" ? <Trans>Movies {select}</Trans> : <Trans>Episodes {select}</Trans>}
    </span>
  );
}

export function StatsDisplay({ stats }: { stats: DashboardStats }) {
  const { t } = useLingui();
  const [moviePeriod, setMoviePeriod] = useState<TimePeriod>("this_month");
  const [episodePeriod, setEpisodePeriod] = useState<TimePeriod>("this_week");

  const { data: movieStats } = useQuery(
    orpc.dashboard.watchHistory.queryOptions({
      input: { type: "movie", period: moviePeriod },
    }),
  );
  const { data: episodeStats } = useQuery(
    orpc.dashboard.watchHistory.queryOptions({
      input: { type: "episode", period: episodePeriod },
    }),
  );

  const movieCount = movieStats?.count ?? stats.moviesThisMonth;
  const movieHistory = movieStats?.history;

  const episodeCount = episodeStats?.count ?? stats.episodesThisWeek;
  const episodeHistory = episodeStats?.history;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={IconMovie}
        color="text-primary"
        bgColor="bg-primary/10"
        value={movieCount}
        index={0}
        sparklineData={movieHistory}
        label={
          <PeriodSelector type="movies" period={moviePeriod} onPeriodChange={setMoviePeriod} />
        }
      />
      <StatCard
        icon={IconDeviceTvOld}
        color="text-status-watching"
        bgColor="bg-status-watching/10"
        value={episodeCount}
        index={1}
        sparklineData={episodeHistory}
        label={
          <PeriodSelector
            type="episodes"
            period={episodePeriod}
            onPeriodChange={setEpisodePeriod}
          />
        }
      />
      <StatCard
        icon={IconBooks}
        color="text-status-watchlist"
        bgColor="bg-status-watchlist/10"
        value={stats.librarySize}
        index={2}
        label={t`In Library`}
      />
      <StatCard
        icon={IconCheck}
        color="text-status-completed"
        bgColor="bg-status-completed/10"
        value={stats.completed}
        index={3}
        label={t`Completed`}
      />
    </div>
  );
}
