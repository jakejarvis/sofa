"use client";

import {
  IconCheck,
  IconLibrary,
  IconMovie,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import type { DashboardStats } from "@/lib/services/discovery";

const statDefs = [
  {
    key: "moviesThisMonth" as const,
    label: "Movies This Month",
    icon: IconMovie,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "episodesThisWeek" as const,
    label: "Episodes This Week",
    icon: IconPlayerPlay,
    color: "text-status-watching",
    bgColor: "bg-status-watching/10",
  },
  {
    key: "librarySize" as const,
    label: "In Library",
    icon: IconLibrary,
    color: "text-status-watchlist",
    bgColor: "bg-status-watchlist/10",
  },
  {
    key: "completed" as const,
    label: "Completed",
    icon: IconCheck,
    color: "text-status-completed",
    bgColor: "bg-status-completed/10",
  },
];

export function StatsDisplay({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {statDefs.map((def, i) => {
        const Icon = def.icon;
        const value = stats[def.key];
        return (
          <motion.div
            key={def.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 24,
              delay: i * 0.08,
            }}
            className="rounded-xl border border-border/30 bg-card/50 p-4"
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-md ${def.bgColor}`}
              >
                <Icon size={13} className={def.color} />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {def.label}
              </span>
            </div>
            <motion.p
              className={`mt-2 font-display text-2xl tabular-nums tracking-tight ${def.color}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 + 0.2 }}
            >
              {value}
            </motion.p>
          </motion.div>
        );
      })}
    </div>
  );
}
