import { Trans, useLingui } from "@lingui/react/macro";
import { IconCalendarWeek } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { orpc } from "@/lib/orpc/client";
import type { BackupFrequency } from "@sofa/api/schemas";
import { formatDate, formatRelativeTime } from "@sofa/i18n/format";

const FREQUENCY_OPTIONS: { value: BackupFrequency; label: string }[] = [
  { value: "6h", label: "6h" },
  { value: "12h", label: "12h" },
  { value: "1d", label: "1d" },
  { value: "7d", label: "7d" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface BackupScheduleState {
  enabled: boolean;
  maxRetention: number;
  frequency: BackupFrequency;
  time: string;
  dow: number;
}

function getNextBackupDate(frequency: BackupFrequency, time: string, dayOfWeek: number): Date {
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

export function BackupScheduleSection() {
  const { t } = useLingui();

  const DAYS_OF_WEEK = [
    t`Sunday`,
    t`Monday`,
    t`Tuesday`,
    t`Wednesday`,
    t`Thursday`,
    t`Friday`,
    t`Saturday`,
  ];

  const {
    data: scheduleData,
    isPending,
    isError,
  } = useQuery(orpc.admin.backups.schedule.queryOptions());

  const [schedule, setSchedule] = useState<BackupScheduleState | null>(null);

  // Use local state if user has modified, else use query data
  const current: BackupScheduleState = schedule ?? {
    enabled: scheduleData?.enabled ?? false,
    maxRetention: scheduleData?.maxRetention ?? 7,
    frequency: (scheduleData?.frequency as BackupFrequency) ?? "1d",
    time: scheduleData?.time ?? "02:00",
    dow: scheduleData?.dayOfWeek ?? 0,
  };

  const { enabled, maxRetention, frequency, time, dow } = current;

  function formatNextBackup(freq: BackupFrequency, timeOfDay: string, dayOfWeek: number): string {
    const next = getNextBackupDate(freq, timeOfDay, dayOfWeek);
    const distance = formatRelativeTime(next);
    return t`Next backup ${distance}`;
  }

  const updateScheduleMutation = useMutation(
    orpc.admin.backups.updateSchedule.mutationOptions({
      onMutate: (input) => {
        const previous = { ...current };
        const patch: Partial<BackupScheduleState> = {};
        if (input.enabled !== undefined) patch.enabled = input.enabled;
        if (input.maxRetention !== undefined) patch.maxRetention = input.maxRetention;
        if (input.frequency !== undefined) patch.frequency = input.frequency as BackupFrequency;
        if (input.time !== undefined) patch.time = input.time;
        if (input.dayOfWeek !== undefined) patch.dow = input.dayOfWeek;
        setSchedule({ ...current, ...patch });
        return { previous };
      },
      onError: (_, input, ctx) => {
        if (ctx?.previous) setSchedule(ctx.previous);
        if (input.enabled !== undefined) {
          toast.error(t`Failed to update scheduled backup setting`);
        } else if (input.maxRetention !== undefined) {
          toast.error(t`Failed to update retention setting`);
        } else {
          toast.error(t`Failed to update schedule`);
        }
      },
    }),
  );

  const togglingSchedule =
    updateScheduleMutation.isPending && updateScheduleMutation.variables?.enabled !== undefined;
  const savingSchedule =
    updateScheduleMutation.isPending && updateScheduleMutation.variables?.frequency !== undefined;

  const toggleScheduled = useCallback(
    (checked: boolean) => {
      updateScheduleMutation.mutate(
        { enabled: checked },
        {
          onSuccess: () =>
            toast.success(checked ? t`Scheduled backups enabled` : t`Scheduled backups disabled`),
        },
      );
    },
    [updateScheduleMutation, t],
  );

  const changeMaxRetention = useCallback(
    (value: number) => {
      updateScheduleMutation.mutate({ maxRetention: value });
    },
    [updateScheduleMutation],
  );

  const changeSchedule = useCallback(
    (newFrequency: BackupFrequency, newTime: string, newDow = current.dow) => {
      updateScheduleMutation.mutate(
        {
          frequency: newFrequency,
          time: newTime,
          dayOfWeek: newDow,
        },
        { onSuccess: () => toast.success(t`Schedule updated`) },
      );
    },
    [updateScheduleMutation, current.dow, t],
  );

  if (isPending) {
    return <Skeleton className="h-20 w-full rounded-xl" />;
  }

  if (isError) {
    return (
      <CardContent>
        <p className="text-muted-foreground text-sm">
          <Trans>Failed to load backup schedule settings.</Trans>
        </p>
      </CardContent>
    );
  }

  return (
    <>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <IconCalendarWeek aria-hidden={true} className="text-primary size-4" />
            </div>
            <div>
              <CardTitle>
                <Trans>Backup schedule</Trans>
              </CardTitle>
              <CardDescription>
                {enabled ? (
                  <span className="inline-flex flex-wrap items-baseline" suppressHydrationWarning>
                    {formatNextBackup(frequency, time, dow)}. <Trans>Keeping</Trans>{" "}
                    <Select
                      value={String(maxRetention)}
                      onValueChange={(v) => v && changeMaxRetention(Number(v))}
                      modal={false}
                    >
                      <SelectTrigger className="decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50 focus-visible:decoration-foreground ms-1.5 me-0.5 !h-auto w-auto gap-0.5 rounded-none border-0 bg-transparent p-0 underline decoration-dotted underline-offset-4 shadow-none hover:bg-transparent focus-visible:decoration-solid focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent">
                        <SelectValue>
                          {(value: string | null) =>
                            value === "0" ? t`unlimited` : value ? t`last ${value}` : null
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start" alignItemWithTrigger={false} className="p-1">
                        {[3, 5, 7, 14, 30, 0].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 0 ? t`unlimited` : t`last ${n}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>{" "}
                    <Trans>backups.</Trans>
                  </span>
                ) : (
                  <Trans>Automatically back up your database on a schedule</Trans>
                )}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={toggleScheduled}
            disabled={togglingSchedule}
            aria-label={t`Toggle scheduled backups`}
          />
        </div>
      </CardContent>

      <AnimatePresence initial={false}>
        {enabled && (
          <CardContent className="border-border/30 border-t pt-4">
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
                  <span className="text-muted-foreground/70 inline-block text-[11px] font-medium tracking-wider uppercase">
                    <Trans>Frequency</Trans>
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
                            ? "border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-sm"
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
                      <span className="text-muted-foreground/70 text-[11px] font-medium tracking-wider uppercase">
                        <Trans>Day:</Trans>{" "}
                      </span>
                      <Select
                        value={String(dow)}
                        onValueChange={(v) => v && changeSchedule(frequency, time, Number(v))}
                        modal={false}
                      >
                        <SelectTrigger className="border-border/50 bg-muted/30 text-foreground hover:bg-muted/50 dark:bg-muted/30 dark:hover:bg-muted/50 h-auto gap-1 px-2.5 py-1 text-xs">
                          <SelectValue>
                            {(value: string | null) =>
                              value !== null ? DAYS_OF_WEEK[Number(value)] : null
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false} className="p-1">
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
                      <span className="text-muted-foreground/70 text-[11px] font-medium tracking-wider uppercase">
                        {frequency === "12h" ? (
                          <Trans>Starting at</Trans>
                        ) : (
                          <Trans>Time:</Trans>
                        )}{" "}
                      </span>
                      <Select
                        value={time}
                        onValueChange={(v) => v && changeSchedule(frequency, v)}
                        modal={false}
                      >
                        <SelectTrigger className="border-border/50 bg-muted/30 text-foreground hover:bg-muted/50 dark:bg-muted/30 dark:hover:bg-muted/50 h-auto gap-1 px-2.5 py-1 text-xs">
                          <SelectValue>
                            {(value: string | null) =>
                              value
                                ? formatDate(new Date(2000, 0, 1, Number(value.split(":")[0]), 0), {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    year: undefined,
                                    month: undefined,
                                    day: undefined,
                                  })
                                : null
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false} className="p-1">
                          {HOURS.map((h) => {
                            const val = `${String(h).padStart(2, "0")}:00`;
                            return (
                              <SelectItem key={h} value={val}>
                                {formatDate(new Date(2000, 0, 1, h, 0), {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  year: undefined,
                                  month: undefined,
                                  day: undefined,
                                })}
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
