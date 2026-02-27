"use client";

import {
  IconCheck,
  IconLibrary,
  IconMovie,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface Stats {
  moviesThisMonth: number;
  episodesThisWeek: number;
  librarySize: number;
  completed: number;
}

const statDefs = [
  {
    key: "moviesThisMonth" as const,
    label: "Movies This Month",
    icon: IconMovie,
  },
  {
    key: "episodesThisWeek" as const,
    label: "Episodes This Week",
    icon: IconPlayerPlay,
  },
  {
    key: "librarySize" as const,
    label: "In Library",
    icon: IconLibrary,
  },
  {
    key: "completed" as const,
    label: "Completed",
    icon: IconCheck,
  },
];

export function StatsSummary() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/feed/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  if (!stats) return null;

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
              <Icon size={14} className="text-primary" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {def.label}
              </span>
            </div>
            <motion.p
              className="mt-2 font-display text-2xl tracking-tight"
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
