"use client";

import { motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const colors = {
  ok: { bg: "bg-green-500", shadow: "0 0 0 0px rgba(74,222,128,0.5)" },
  error: { bg: "bg-destructive", shadow: "0 0 0 0px rgba(248,113,113,0.5)" },
  warn: { bg: "bg-amber-500", shadow: "0 0 0 0px rgba(251,191,36,0.5)" },
  inactive: { bg: "bg-muted-foreground/30", shadow: "" },
};

const pulseColors = {
  ok: "0 0 0 4px rgba(74,222,128,0)",
  error: "0 0 0 4px rgba(248,113,113,0)",
  warn: "0 0 0 4px rgba(251,191,36,0)",
};

const defaultLabels: Record<string, string> = {
  ok: "Healthy",
  error: "Error",
  warn: "Warning",
  inactive: "Inactive",
};

/** Small colored status dot with a pulsing ring for active states. */
export function StatusDot({
  status,
  label,
  className,
}: {
  status: "ok" | "error" | "warn" | "inactive";
  /** Tooltip text. Defaults to a label derived from the status. */
  label?: string;
  className?: string;
}) {
  const { bg, shadow } = colors[status];
  const pulse = status !== "inactive";
  const tooltipText = label ?? defaultLabels[status];

  const dotEl = pulse ? (
    <motion.span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        bg,
        className,
      )}
      animate={{
        boxShadow: [shadow, pulseColors[status as keyof typeof pulseColors]],
      }}
      transition={{
        duration: 1.2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeOut",
        repeatDelay: 0.3,
      }}
    />
  ) : (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        bg,
        className,
      )}
    />
  );

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default">{dotEl}</TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
