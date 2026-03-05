"use client";

import { IconCalendarRepeat, IconChevronDown } from "@tabler/icons-react";
import { format, formatDistanceToNow } from "date-fns";
import { createStore, Provider, useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  backupScheduleAtom,
  savingScheduleAtom,
  togglingScheduleAtom,
  useBackupScheduleActions,
} from "@/lib/atoms/backup-schedule";
import type { BackupFrequency } from "@/lib/cron";

const FREQUENCY_OPTIONS: { value: BackupFrequency; label: string }[] = [
  { value: "6h", label: "6h" },
  { value: "12h", label: "12h" },
  { value: "1d", label: "1d" },
  { value: "7d", label: "7d" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function getNextBackupDate(
  frequency: BackupFrequency,
  time: string,
  dayOfWeek: number,
): Date {
  const now = new Date();
  const [h, m] = time.split(":").map(Number);

  if (frequency === "6h") {
    const next = new Date(now);
    const currentHour = next.getHours();
    const nextHour = Math.ceil((currentHour + 1) / 6) * 6;
    next.setHours(nextHour, m, 0, 0);
    if (next <= now) next.setHours(next.getHours() + 6);
    return next;
  }

  if (frequency === "12h") {
    const next = new Date(now);
    const h2 = (h + 12) % 24;
    const candidates = [h, h2].sort((a, b) => a - b);
    for (const candidate of candidates) {
      next.setHours(candidate, m, 0, 0);
      if (next > now) return next;
    }
    next.setDate(next.getDate() + 1);
    next.setHours(candidates[0], m, 0, 0);
    return next;
  }

  if (frequency === "7d") {
    const next = new Date(now);
    const daysUntil = (dayOfWeek - next.getDay() + 7) % 7;
    if (daysUntil === 0) {
      next.setHours(h, m, 0, 0);
      if (next > now) return next;
      next.setDate(next.getDate() + 7);
      next.setHours(h, m, 0, 0);
      return next;
    }
    next.setDate(next.getDate() + daysUntil);
    next.setHours(h, m, 0, 0);
    return next;
  }

  // 1d
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

function formatNextBackup(
  frequency: BackupFrequency,
  time: string,
  dayOfWeek: number,
): string {
  const next = getNextBackupDate(frequency, time, dayOfWeek);
  return `Next backup ${formatDistanceToNow(next, { addSuffix: true })}`;
}

export function BackupScheduleSection({
  initialScheduledEnabled,
  initialMaxRetention,
  initialFrequency,
  initialTime,
  initialDow,
}: {
  initialScheduledEnabled: boolean;
  initialMaxRetention: number;
  initialFrequency: BackupFrequency;
  initialTime: string;
  initialDow: number;
}) {
  const [store] = useState(() => {
    const s = createStore();
    s.set(backupScheduleAtom, {
      enabled: initialScheduledEnabled,
      maxRetention: initialMaxRetention,
      frequency: initialFrequency,
      time: initialTime,
      dow: initialDow,
    });
    return s;
  });

  return (
    <Provider store={store}>
      <BackupScheduleInner />
    </Provider>
  );
}

function BackupScheduleInner() {
  const schedule = useAtomValue(backupScheduleAtom);
  const savingSchedule = useAtomValue(savingScheduleAtom);
  const togglingSchedule = useAtomValue(togglingScheduleAtom);
  const { toggleScheduled, changeMaxRetention, changeSchedule } =
    useBackupScheduleActions();

  const { enabled, maxRetention, frequency, time, dow } = schedule;

  return (
    <>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconCalendarRepeat className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle>Backup schedule</CardTitle>
              <CardDescription>
                {enabled ? (
                  <span className="inline-flex flex-wrap items-baseline gap-1">
                    <span suppressHydrationWarning>
                      {formatNextBackup(frequency, time, dow)}.
                    </span>{" "}
                    Keeping{" "}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-0.5 border-b border-dotted border-muted-foreground/50 transition-colors hover:text-foreground">
                        {maxRetention === 0
                          ? "unlimited"
                          : `last ${maxRetention}`}
                        <IconChevronDown className="size-2.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup
                          value={String(maxRetention)}
                          onValueChange={(v) => changeMaxRetention(Number(v))}
                        >
                          {[3, 5, 7, 14, 30, 0].map((n) => (
                            <DropdownMenuRadioItem key={n} value={String(n)}>
                              {n === 0 ? "unlimited" : n}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>{" "}
                    backups.
                  </span>
                ) : (
                  "Automatically back up your database on a schedule"
                )}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={toggleScheduled}
            disabled={togglingSchedule}
          />
        </div>
      </CardContent>

      <AnimatePresence initial={false}>
        {enabled && (
          <CardContent className="border-t border-border/30 pt-4">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3">
                {/* Frequency selector */}
                <div className="space-y-1.5">
                  <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Frequency
                  </span>
                  <div className="flex gap-1">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant="outline"
                        size="sm"
                        disabled={savingSchedule}
                        onClick={() => changeSchedule(opt.value, time)}
                        className={
                          frequency === opt.value
                            ? "border-primary/50 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                            : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Day of week — shown for 7d only */}
                <AnimatePresence initial={false}>
                  {frequency === "7d" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        Day:{" "}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50">
                          {DAYS_OF_WEEK[dow]}
                          <IconChevronDown className="size-3 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuRadioGroup
                            value={String(dow)}
                            onValueChange={(v) =>
                              changeSchedule(frequency, time, Number(v))
                            }
                          >
                            {DAYS_OF_WEEK.map((day, i) => (
                              <DropdownMenuRadioItem
                                key={day}
                                value={String(i)}
                              >
                                {day}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Time selector — shown for 12h, 1d, 7d */}
                <AnimatePresence initial={false}>
                  {frequency !== "6h" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {frequency === "12h" ? "Starting at" : "Time:"}{" "}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50">
                          {format(
                            new Date(
                              2000,
                              0,
                              1,
                              ...(time.split(":").map(Number) as [
                                number,
                                number,
                              ]),
                            ),
                            "h:mm a",
                          )}
                          <IconChevronDown className="size-3 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuRadioGroup
                            value={time}
                            onValueChange={(v) => changeSchedule(frequency, v)}
                          >
                            {HOURS.map((h) => {
                              const val = `${String(h).padStart(2, "0")}:00`;
                              return (
                                <DropdownMenuRadioItem key={h} value={val}>
                                  {format(new Date(2000, 0, 1, h, 0), "h:mm a")}
                                </DropdownMenuRadioItem>
                              );
                            })}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </CardContent>
        )}
      </AnimatePresence>
    </>
  );
}
