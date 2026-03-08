"use client";

import {
  IconCheck,
  IconLibrary,
  IconMovie,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStats } from "@/hooks/use-stats";
import type {
  DashboardStats,
  HistoryBucket,
  TimePeriod,
} from "@/lib/services/discovery";
import { Sparkline } from "./sparkline";

const periodLabels: Record<TimePeriod, string> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  this_year: "This Year",
};

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
      className="relative animate-stagger-item overflow-hidden rounded-xl border border-border/30 bg-card/50 p-4"
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      {sparklineData && <Sparkline data={sparklineData} color={color} />}
      <div className="relative z-10 flex items-center gap-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md ${bgColor}`}
        >
          <Icon aria-hidden={true} className={`size-[13px] ${color}`} />
        </div>
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        suppressHydrationWarning
        className={`relative z-10 mt-2 font-display text-2xl tabular-nums tracking-tight ${color} motion-safe:transition-opacity motion-safe:duration-300`}
      >
        {value}
      </p>
    </div>
  );
}

const inlineTriggerClass =
  "h-auto w-auto gap-0.5 rounded-none border-0 bg-transparent py-1 px-0.5 -my-1 -mx-0.5 sm:p-0 sm:m-0 [font-size:inherit] [line-height:inherit] shadow-none underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 hover:bg-transparent hover:text-foreground hover:decoration-foreground/50 focus-visible:ring-0 focus-visible:decoration-solid focus-visible:decoration-foreground dark:bg-transparent dark:hover:bg-transparent";

function PeriodSelector({
  noun,
  period,
  onPeriodChange,
}: {
  noun: string;
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      {noun}{" "}
      <Select
        value={period}
        onValueChange={(v) => v && onPeriodChange(v as TimePeriod)}
        modal={false}
      >
        <SelectTrigger
          className={`${inlineTriggerClass} text-foreground/80 uppercase`}
        >
          <SelectValue>
            {(value: TimePeriod | null) => (value ? periodLabels[value] : null)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          alignItemWithTrigger={false}
          className="p-1"
        >
          {periods.map((p) => (
            <SelectItem key={p} value={p}>
              {periodLabels[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}

export function StatsDisplay({ stats }: { stats: DashboardStats }) {
  const [moviePeriod, setMoviePeriod] = useState<TimePeriod>("this_month");
  const [episodePeriod, setEpisodePeriod] = useState<TimePeriod>("this_week");

  const movieStats = useStats("movies", moviePeriod);
  const episodeStats = useStats("episodes", episodePeriod);

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
          <PeriodSelector
            noun="Movies"
            period={moviePeriod}
            onPeriodChange={setMoviePeriod}
          />
        }
      />
      <StatCard
        icon={IconPlayerPlay}
        color="text-status-watching"
        bgColor="bg-status-watching/10"
        value={episodeCount}
        index={1}
        sparklineData={episodeHistory}
        label={
          <PeriodSelector
            noun="Episodes"
            period={episodePeriod}
            onPeriodChange={setEpisodePeriod}
          />
        }
      />
      <StatCard
        icon={IconLibrary}
        color="text-status-watchlist"
        bgColor="bg-status-watchlist/10"
        value={stats.librarySize}
        index={2}
        label="In Library"
      />
      <StatCard
        icon={IconCheck}
        color="text-status-completed"
        bgColor="bg-status-completed/10"
        value={stats.completed}
        index={3}
        label="Completed"
      />
    </div>
  );
}
