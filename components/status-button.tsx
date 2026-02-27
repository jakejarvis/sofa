"use client";

import {
  IconBookmark,
  IconCheck,
  IconPlayerPlay,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const statuses = [
  {
    value: "watchlist",
    label: "Watchlist",
    icon: IconBookmark,
    colorClass:
      "border-status-watchlist/30 bg-status-watchlist/10 text-status-watchlist hover:bg-status-watchlist/15",
  },
  {
    value: "in_progress",
    label: "Watching",
    icon: IconPlayerPlay,
    colorClass:
      "border-status-watching/30 bg-status-watching/10 text-status-watching hover:bg-status-watching/15",
  },
  {
    value: "completed",
    label: "Completed",
    icon: IconCheck,
    colorClass:
      "border-status-completed/30 bg-status-completed/10 text-status-completed hover:bg-status-completed/15",
  },
] as const;

interface StatusButtonProps {
  currentStatus: string | null;
  onChange: (status: string | null) => void;
}

export function StatusButton({ currentStatus, onChange }: StatusButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = statuses.find((s) => s.value === currentStatus);
  const CurrentIcon = current?.icon ?? IconPlus;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-all active:scale-[0.97] ${
          current
            ? current.colorClass
            : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
        }`}
      >
        <CurrentIcon size={15} />
        {current ? current.label : "Add to List"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{
              type: "spring" as const,
              stiffness: 500,
              damping: 30,
            }}
            className="absolute left-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-border/50 bg-popover/95 p-1 shadow-xl shadow-black/30 backdrop-blur-xl"
          >
            {statuses.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    onChange(s.value === currentStatus ? null : s.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent ${
                    s.value === currentStatus
                      ? "text-primary"
                      : "text-foreground"
                  }`}
                >
                  <Icon size={15} />
                  {s.label}
                  {s.value === currentStatus && (
                    <IconCheck size={13} className="ml-auto" />
                  )}
                </button>
              );
            })}
            {currentStatus && (
              <>
                <div className="my-1 border-t border-border/50" />
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-accent"
                >
                  <IconX size={15} />
                  Remove
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
