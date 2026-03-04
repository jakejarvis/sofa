"use client";

import {
  IconCheck,
  IconChevronDown,
  IconLibrary,
  IconMovie,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  loading,
  sparklineData,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: index * 0.08,
      }}
      className="relative overflow-hidden rounded-xl border border-border/30 bg-card/50 p-4"
    >
      {sparklineData && <Sparkline data={sparklineData} color={color} />}
      <div className="relative z-10 flex items-center gap-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md ${bgColor}`}
        >
          <Icon className={`size-[13px] ${color}`} />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <motion.p
        className={`relative z-10 mt-2 font-display text-2xl tabular-nums tracking-tight ${color} transition-opacity ${loading ? "opacity-40" : ""}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0.4 : 1 }}
        transition={{ delay: index * 0.08 + 0.2 }}
      >
        {value}
      </motion.p>
    </motion.div>
  );
}

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
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-0.5 border-b border-dotted border-muted-foreground/50 uppercase text-foreground/80 transition-colors hover:text-foreground">
          {periodLabels[period]}
          <IconChevronDown className="size-2.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={period}
            onValueChange={(v) => onPeriodChange(v as TimePeriod)}
          >
            {periods.map((p) => (
              <DropdownMenuRadioItem key={p} value={p}>
                {periodLabels[p]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

async function fetchStats(
  type: "movies" | "episodes",
  period: TimePeriod,
): Promise<{ count: number; history: HistoryBucket[] }> {
  const res = await fetch(
    `/api/stats?type=${type}&period=${period}&history=true`,
  );
  return res.json();
}

export function StatsDisplay({ stats }: { stats: DashboardStats }) {
  const [moviePeriod, setMoviePeriod] = useState<TimePeriod>("this_month");
  const [episodePeriod, setEpisodePeriod] = useState<TimePeriod>("this_week");
  const [movieCount, setMovieCount] = useState(stats.moviesThisMonth);
  const [episodeCount, setEpisodeCount] = useState(stats.episodesThisWeek);
  const [movieLoading, setMovieLoading] = useState(false);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [movieHistory, setMovieHistory] = useState<HistoryBucket[]>();
  const [episodeHistory, setEpisodeHistory] = useState<HistoryBucket[]>();

  useEffect(() => {
    fetchStats("movies", "this_month").then((d) => setMovieHistory(d.history));
    fetchStats("episodes", "this_week").then((d) =>
      setEpisodeHistory(d.history),
    );
  }, []);

  async function handleMoviePeriodChange(period: TimePeriod) {
    setMoviePeriod(period);
    setMovieLoading(true);
    const data = await fetchStats("movies", period);
    setMovieCount(data.count);
    setMovieHistory(data.history);
    setMovieLoading(false);
  }

  async function handleEpisodePeriodChange(period: TimePeriod) {
    setEpisodePeriod(period);
    setEpisodeLoading(true);
    const data = await fetchStats("episodes", period);
    setEpisodeCount(data.count);
    setEpisodeHistory(data.history);
    setEpisodeLoading(false);
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={IconMovie}
        color="text-primary"
        bgColor="bg-primary/10"
        value={movieCount}
        index={0}
        loading={movieLoading}
        sparklineData={movieHistory}
        label={
          <PeriodSelector
            noun="Movies"
            period={moviePeriod}
            onPeriodChange={handleMoviePeriodChange}
          />
        }
      />
      <StatCard
        icon={IconPlayerPlay}
        color="text-status-watching"
        bgColor="bg-status-watching/10"
        value={episodeCount}
        index={1}
        loading={episodeLoading}
        sparklineData={episodeHistory}
        label={
          <PeriodSelector
            noun="Episodes"
            period={episodePeriod}
            onPeriodChange={handleEpisodePeriodChange}
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
