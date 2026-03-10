"use client";

import {
  IconCheck,
  IconPlayerPlayFilled,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

const watchingStyle = {
  label: "Watching",
  icon: IconPlayerPlayFilled,
  class: "text-status-watching",
  bgClass: "bg-status-watching/10 hover:bg-status-watching/15",
  borderClass: "ring-status-watching/20",
};

const statusConfig = {
  watchlist: watchingStyle,
  in_progress: watchingStyle,
  completed: {
    label: "Completed",
    icon: IconCheck,
    class: "text-status-completed",
    bgClass: "bg-status-completed/10 hover:bg-status-completed/15",
    borderClass: "ring-status-completed/20",
  },
} as const;

interface StatusButtonProps {
  currentStatus: string | null;
  onChange: (status: string | null) => void;
}

export function StatusButton({ currentStatus, onChange }: StatusButtonProps) {
  const config =
    statusConfig[currentStatus as keyof typeof statusConfig] ?? null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!config ? (
        <motion.button
          key="add"
          type="button"
          onClick={() => onChange("watchlist")}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary/10 px-4 font-medium text-primary text-sm ring-1 ring-primary/20 transition-all hover:bg-primary/15 hover:ring-primary/30 active:scale-[0.97]"
        >
          <IconPlus aria-hidden={true} className="size-3.5" strokeWidth={2.5} />
          Watchlist
        </motion.button>
      ) : (
        <motion.button
          key="status"
          type="button"
          onClick={() => onChange(null)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          title="Remove from library"
          className={`group inline-flex h-9 items-center gap-2 rounded-lg px-4 font-medium text-sm ring-1 transition-all active:scale-[0.97] ${config.class} ${config.bgClass} ${config.borderClass} hover:!bg-destructive/10 hover:!text-destructive hover:!ring-destructive/30`}
        >
          <span className="grid [&>svg]:col-start-1 [&>svg]:row-start-1">
            <config.icon
              aria-hidden={true}
              className="size-3.5 transition-opacity group-hover:opacity-0"
            />
            <IconX
              aria-hidden={true}
              className="size-3.5 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
            />
          </span>
          <span className="grid [&>span]:col-start-1 [&>span]:row-start-1">
            <span className="transition-opacity group-hover:opacity-0">
              {config.label}
            </span>
            <span className="opacity-0 transition-opacity group-hover:opacity-100">
              Remove
            </span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
