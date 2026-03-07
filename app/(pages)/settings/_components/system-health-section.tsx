"use client";

import {
  IconActivity,
  IconAlertTriangle,
  IconCalendarCheck,
  IconCheck,
  IconDatabase,
  IconPlayerPlay,
  IconRefresh,
} from "@tabler/icons-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { useState } from "react";
import { toast } from "sonner";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTimeAgo } from "@/hooks/use-time-ago";
import {
  getSystemHealthAction,
  triggerJobAction,
} from "@/lib/actions/settings";
import {
  systemHealthDataAtom,
  systemHealthRefreshingAtom,
} from "@/lib/atoms/system-health";
import type { SystemHealthData } from "@/lib/services/system-health";

const JOB_LABELS: Record<string, string> = {
  nightlyRefreshLibrary: "Library refresh",
  refreshAvailability: "Availability",
  refreshRecommendations: "Recommendations",
  refreshTvChildren: "TV episodes",
  cacheImages: "Image cache",
  scheduledBackup: "Backup",
  updateCheck: "Update check",
};

/** Convert a cron pattern to a short human-readable string */
function cronToHuman(pattern: string): string {
  const parts = pattern.split(" ");
  if (parts.length !== 5) return pattern;
  const [min, hour, _dom, _mon, dow] = parts;

  // Every N hours: "0 */6 * * *"
  if (hour.startsWith("*/")) {
    const n = Number.parseInt(hour.slice(2), 10);
    return `Every ${n}h`;
  }

  // Twice daily: "0 1,13 * * *"
  if (hour.includes(",") && !hour.includes("/") && !hour.includes("-")) {
    const hours = hour.split(",");
    if (hours.length === 2) {
      return `Daily at ${hours.map((h) => `${h.padStart(2, "0")}:${min.padStart(2, "0")}`).join(", ")}`;
    }
  }

  // Daily at specific time: "0 3 * * *"
  if (/^\d+$/.test(hour) && /^\d+$/.test(min) && dow === "*") {
    return `Daily at ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  }

  // Weekly
  if (/^\d+$/.test(dow)) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `Weekly on ${days[Number(dow)] ?? dow}`;
  }

  return pattern;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export function SkeletonCards() {
  return (
    <div className="space-y-3">
      {["status", "jobs", "storage"].map((s) => (
        <Card key={s} className="border-l-2 border-l-primary/30">
          <CardContent>
            <div className="flex items-start gap-3">
              <Skeleton className="mt-0.5 h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Inline component that live-updates a relative timestamp */
function LiveTimeAgo({
  date,
  fallback = "",
}: {
  date: string | Date | null | undefined;
  fallback?: string;
}) {
  const text = useTimeAgo(date, { fallback });
  return <>{text}</>;
}

function useSystemHealthRefresh() {
  const [isRefreshing, setRefreshing] = useAtom(systemHealthRefreshingAtom);
  const setData = useSetAtom(systemHealthDataAtom);

  async function refresh() {
    setRefreshing(true);
    try {
      const newData = await getSystemHealthAction();
      setData(newData);
    } catch {
      toast.error("Failed to refresh system health");
    } finally {
      setRefreshing(false);
    }
  }

  return { isRefreshing, refresh };
}

/** Hydrates the system health atom and renders the 3 cards */
export function SystemHealthCards({
  initialData,
}: {
  initialData: SystemHealthData;
}) {
  useHydrateAtoms([
    [systemHealthDataAtom, initialData],
    [systemHealthRefreshingAtom, false],
  ]);

  return (
    <div className="space-y-3">
      <SystemStatusCard />
      <BackgroundJobsCard />
      <StorageCard />
    </div>
  );
}

function RefreshButton() {
  const { isRefreshing, refresh } = useSystemHealthRefresh();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh system health"
            onClick={refresh}
            disabled={isRefreshing}
            className="text-muted-foreground"
          />
        }
      >
        {isRefreshing ? <Spinner /> : <IconRefresh />}
      </TooltipTrigger>
      <TooltipContent>Refresh</TooltipContent>
    </Tooltip>
  );
}

function SystemStatusCard() {
  const data = useAtomValue(systemHealthDataAtom);

  return (
    <Card className="border-l-2 border-l-primary/30">
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconActivity
                aria-hidden={true}
                className="size-4 text-primary"
              />
            </div>
            <div>
              <CardTitle>Health status</CardTitle>
              <CardDescription suppressHydrationWarning>
                Checked <LiveTimeAgo date={data.checkedAt} />
              </CardDescription>
            </div>
          </div>
          <RefreshButton />
        </div>
      </CardContent>

      {/* Database */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[11px] text-muted-foreground/70 uppercase tracking-wider">
            Database
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatBytes(data.database.dbSizeBytes)}
            {data.database.walSizeBytes > 0 &&
              ` + ${formatBytes(data.database.walSizeBytes)} WAL`}
          </span>
        </div>
      </CardContent>

      {/* TMDB */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[11px] text-muted-foreground/70 uppercase tracking-wider">
            TMDB API
          </span>
          {!data.tmdb.tokenConfigured ? (
            <>
              <StatusDot status="error" />
              <span className="text-muted-foreground/50 text-xs">
                Not configured
              </span>
            </>
          ) : data.tmdb.connected && data.tmdb.tokenValid ? (
            <>
              <StatusDot status="ok" />
              <span className="text-muted-foreground text-xs">Connected</span>
              <span className="font-mono text-[11px] text-muted-foreground/80">
                {data.tmdb.responseTimeMs}ms
              </span>
            </>
          ) : data.tmdb.connected && !data.tmdb.tokenValid ? (
            <>
              <StatusDot status="error" />
              <span className="text-destructive text-xs">Invalid token</span>
            </>
          ) : (
            <>
              <StatusDot status="error" />
              <span className="text-destructive text-xs">Unreachable</span>
              {data.tmdb.error && (
                <span className="text-[11px] text-muted-foreground/50">
                  {data.tmdb.error}
                </span>
              )}
            </>
          )}
        </div>
      </CardContent>

      {/* Environment */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 font-medium text-[11px] text-muted-foreground/70 uppercase tracking-wider">
            Environment
            {data.environment.dataDirWritable ? (
              <IconCheck aria-hidden={true} className="size-3 text-green-500" />
            ) : (
              <IconAlertTriangle
                aria-hidden={true}
                className="size-3 text-destructive"
              />
            )}
          </span>
          <div className="space-y-1">
            {data.environment.envVars
              .filter((env) => env.value !== null)
              .map((env) => (
                <div
                  key={env.name}
                  className="flex items-baseline gap-[1px] font-mono text-[11px] leading-relaxed"
                >
                  <span className="text-muted-foreground/60">{env.name}=</span>
                  <span className="break-all text-muted-foreground">
                    {env.value}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BackgroundJobsCard() {
  const data = useAtomValue(systemHealthDataAtom);
  const { refresh } = useSystemHealthRefresh();
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  const handleTrigger = async (jobName: string) => {
    setTriggeringJob(jobName);
    try {
      await triggerJobAction(jobName);
      toast.success(`${JOB_LABELS[jobName] ?? jobName} triggered`);
      // Refresh after a brief delay so the run shows up
      setTimeout(refresh, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger job");
    } finally {
      setTriggeringJob(null);
    }
  };

  const sortedJobs = [...data.jobs].sort((a, b) => {
    if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
    if (!a.nextRunAt && !b.nextRunAt) return 0;
    if (!a.nextRunAt) return 1;
    if (!b.nextRunAt) return -1;
    return new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime();
  });
  const activeJobs = data.jobs.filter((j) => !j.disabled);
  const healthyCount = activeJobs.filter(
    (j) => j.lastStatus === "success",
  ).length;

  return (
    <Card className="border-l-2 border-l-primary/30">
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconCalendarCheck
                aria-hidden={true}
                className="size-4 text-primary"
              />
            </div>
            <div>
              <CardTitle>Background jobs</CardTitle>
              <CardDescription>
                {healthyCount} of {activeJobs.length} jobs healthy
              </CardDescription>
            </div>
          </div>
          <RefreshButton />
        </div>
      </CardContent>
      <CardContent className="border-border/30 border-t px-0 pt-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b-border/30 hover:bg-transparent">
              <TableHead className="h-8 pl-5 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Job
              </TableHead>
              <TableHead className="h-8 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Schedule
              </TableHead>
              <TableHead className="h-8 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Last run
              </TableHead>
              <TableHead className="h-8 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Next run
              </TableHead>
              <TableHead className="h-8 pr-5 text-right font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedJobs.map((job) => {
              const isTriggering = triggeringJob === job.jobName;
              const isRunning = job.isCurrentlyRunning || isTriggering;

              return (
                <TableRow
                  key={job.jobName}
                  className="border-b-border/20 hover:bg-muted/30"
                >
                  {/* Job name + status */}
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-2">
                      {job.disabled ? (
                        <StatusDot status="inactive" label="Disabled" />
                      ) : isRunning ? (
                        <Spinner className="size-2.5" />
                      ) : job.lastStatus === null ? (
                        <StatusDot status="warn" label="Never run" />
                      ) : job.lastStatus === "success" ? (
                        <StatusDot status="ok" label="Last run succeeded" />
                      ) : (
                        <StatusDot
                          status="error"
                          label={job.lastError ?? "Last run failed"}
                        />
                      )}
                      <span className="text-muted-foreground text-xs">
                        {JOB_LABELS[job.jobName] ?? job.jobName}
                      </span>
                    </div>
                  </TableCell>

                  {/* Schedule */}
                  <TableCell>
                    {job.cronPattern ? (
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">
                          <span className="text-muted-foreground/80 text-xs">
                            {cronToHuman(job.cronPattern)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="font-mono">{job.cronPattern}</span>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">
                        —
                      </span>
                    )}
                  </TableCell>

                  {/* Last run */}
                  <TableCell>
                    {job.lastRunAt ? (
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">
                          <div className="flex items-baseline gap-1.5">
                            <span
                              className="text-muted-foreground/80 text-xs"
                              suppressHydrationWarning
                            >
                              <LiveTimeAgo date={job.lastRunAt} />
                            </span>
                            {job.lastDurationMs !== null &&
                              job.lastDurationMs > 0 && (
                                <span className="font-mono text-[10px] text-muted-foreground/50">
                                  {formatDuration(job.lastDurationMs)}
                                </span>
                              )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {new Date(job.lastRunAt).toLocaleString()}
                          {job.lastError && (
                            <div className="mt-1 text-destructive">
                              {job.lastError}
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">
                        Never
                      </span>
                    )}
                  </TableCell>

                  {/* Next run */}
                  <TableCell>
                    {job.nextRunAt ? (
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">
                          <span
                            className="text-muted-foreground/80 text-xs"
                            suppressHydrationWarning
                          >
                            <LiveTimeAgo date={job.nextRunAt} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {new Date(job.nextRunAt).toLocaleString()}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">
                        —
                      </span>
                    )}
                  </TableCell>

                  {/* Trigger button */}
                  <TableCell className="pr-5 text-right">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Trigger job"
                            className="size-6"
                            disabled={isRunning || job.disabled}
                            onClick={() => handleTrigger(job.jobName)}
                          />
                        }
                      >
                        {isRunning ? (
                          <Spinner className="size-3" />
                        ) : (
                          <IconPlayerPlay
                            aria-hidden={true}
                            className="size-3 text-muted-foreground/70"
                          />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Run now</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StorageCard() {
  const data = useAtomValue(systemHealthDataAtom);

  return (
    <Card className="border-l-2 border-l-primary/30">
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconDatabase
                aria-hidden={true}
                className="size-4 text-primary"
              />
            </div>
            <div>
              <CardTitle>Storage</CardTitle>
              <CardDescription>
                Image cache and backup disk usage
              </CardDescription>
            </div>
          </div>
          <RefreshButton />
        </div>
      </CardContent>

      {/* Image cache */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[11px] text-muted-foreground/70 uppercase tracking-wider">
            Image cache
          </span>
          {data.imageCache.enabled ? (
            <span className="font-mono text-[11px] text-muted-foreground/50">
              {formatBytes(data.imageCache.totalSizeBytes)}
            </span>
          ) : null}
        </div>
        {data.imageCache.enabled ? (
          <>
            <p className="mt-1 text-muted-foreground text-xs">
              {data.imageCache.imageCount.toLocaleString()} cached images
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/50 leading-relaxed">
              {Object.entries(data.imageCache.categories)
                .map(([name, cat]) => `${name} ${cat.count}`)
                .join(" · ")}
            </p>
          </>
        ) : (
          <p className="mt-1 flex items-center gap-1.5 text-muted-foreground/50 text-xs">
            <StatusDot status="inactive" />
            Disabled
          </p>
        )}
      </CardContent>

      {/* Backup summary */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[11px] text-muted-foreground/70 uppercase tracking-wider">
            Backups
          </span>
          {data.backups.backupCount > 0 && (
            <span className="font-mono text-[11px] text-muted-foreground/50">
              {formatBytes(data.backups.totalSizeBytes)}
            </span>
          )}
        </div>
        {data.backups.backupCount > 0 ? (
          <p
            className="mt-1 text-muted-foreground text-xs"
            suppressHydrationWarning
          >
            {data.backups.backupCount} backups · last{" "}
            <LiveTimeAgo date={data.backups.lastBackupAt} fallback="unknown" />
          </p>
        ) : (
          <p className="mt-1 flex items-center gap-1.5 text-muted-foreground/50 text-xs">
            <StatusDot status="inactive" />
            No backups yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
