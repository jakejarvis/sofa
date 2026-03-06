"use client";

import { IconCalendarWeek } from "@tabler/icons-react";
import { format, formatDistanceToNow } from "date-fns";
import { useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useHydrateAtoms([
    [
      backupScheduleAtom,
      {
        enabled: initialScheduledEnabled,
        maxRetention: initialMaxRetention,
        frequency: initialFrequency,
        time: initialTime,
        dow: initialDow,
      },
    ],
  ]);

  return <BackupScheduleInner />;
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
              <IconCalendarWeek
                aria-hidden={true}
                className="size-4 text-primary"
              />
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
                    <Select
                      value={String(maxRetention)}
                      onValueChange={(v) => v && changeMaxRetention(Number(v))}
                    >
                      <SelectTrigger className="h-auto w-auto gap-0.5 rounded-none border-0 bg-transparent p-0 shadow-none underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 hover:bg-transparent hover:text-foreground hover:decoration-foreground/50 focus-visible:ring-0 focus-visible:decoration-solid focus-visible:decoration-foreground dark:bg-transparent dark:hover:bg-transparent">
                        <SelectValue>
                          {(value: string | null) =>
                            value === "0"
                              ? "unlimited"
                              : value
                                ? `last ${value}`
                                : null
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        align="start"
                        alignItemWithTrigger={false}
                        className="p-1"
                      >
                        {[3, 5, 7, 14, 30, 0].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 0 ? "unlimited" : `last ${n}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>{" "}
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
            aria-label="Toggle scheduled backups"
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
                  <ButtonGroup>
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
                  </ButtonGroup>
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
                      <Select
                        value={String(dow)}
                        onValueChange={(v) =>
                          v && changeSchedule(frequency, time, Number(v))
                        }
                      >
                        <SelectTrigger className="h-auto gap-1 border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-foreground hover:bg-muted/50 dark:bg-muted/30 dark:hover:bg-muted/50">
                          <SelectValue>
                            {(value: string | null) =>
                              value !== null
                                ? DAYS_OF_WEEK[Number(value)]
                                : null
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          align="start"
                          alignItemWithTrigger={false}
                          className="p-1"
                        >
                          {DAYS_OF_WEEK.map((day, i) => (
                            <SelectItem key={day} value={String(i)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select
                        value={time}
                        onValueChange={(v) => v && changeSchedule(frequency, v)}
                      >
                        <SelectTrigger className="h-auto gap-1 border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-foreground hover:bg-muted/50 dark:bg-muted/30 dark:hover:bg-muted/50">
                          <SelectValue>
                            {(value: string | null) =>
                              value
                                ? format(
                                    new Date(
                                      2000,
                                      0,
                                      1,
                                      Number(value.split(":")[0]),
                                      0,
                                    ),
                                    "h:mm a",
                                  )
                                : null
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          align="start"
                          alignItemWithTrigger={false}
                          className="p-1"
                        >
                          {HOURS.map((h) => {
                            const val = `${String(h).padStart(2, "0")}:00`;
                            return (
                              <SelectItem key={h} value={val}>
                                {format(new Date(2000, 0, 1, h, 0), "h:mm a")}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
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
