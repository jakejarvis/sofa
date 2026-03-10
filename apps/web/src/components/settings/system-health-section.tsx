import type { SystemHealthData } from "@sofa/api/schemas";
import {
  IconActivity,
  IconAlertTriangle,
  IconCalendarCheck,
  IconCheck,
  IconDatabase,
  IconPlayerPlay,
  IconRefresh,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { orpc } from "@/lib/orpc/client";

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

/** Hydrates system health state and renders the 3 cards */
export function SystemHealthCards() {
  const queryClient = useQueryClient();
  const {
    data: statusData,
    isPending,
    isFetching,
  } = useQuery(orpc.systemStatus.queryOptions());
  const data = statusData?.health ?? null;
  const isRefreshing = isFetching;
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: orpc.systemStatus.key() });

  if (isPending || !data) return <SkeletonCards />;

  return (
    <div className="space-y-3">
      <SystemStatusCard
        checkedAt={data.checkedAt}
        database={data.database}
        tmdb={data.tmdb}
        environment={data.environment}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />
      <BackgroundJobsCard
        jobs={data.jobs}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />
      <StorageCard
        imageCache={data.imageCache}
        backups={data.backups}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />
    </div>
  );
}

function RefreshButton({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh system health"
            onClick={onRefresh}
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

function SystemStatusCard({
  checkedAt,
  database,
  tmdb,
  environment,
  isRefreshing,
  onRefresh,
}: Pick<SystemHealthData, "checkedAt" | "database" | "tmdb" | "environment"> & {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
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
                Checked <LiveTimeAgo date={checkedAt} />
              </CardDescription>
            </div>
          </div>
          <RefreshButton isRefreshing={isRefreshing} onRefresh={onRefresh} />
        </div>
      </CardContent>

      {/* Database */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[11px] text-muted-foreground/70 uppercase tracking-wider">
            Database
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatBytes(database.dbSizeBytes)}
            {database.walSizeBytes > 0 &&
              ` + ${formatBytes(database.walSizeBytes)} WAL`}
          </span>
        </div>
      </CardContent>

      {/* TMDB */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[11px] text-muted-foreground/70 uppercase tracking-wider">
            TMDB API
          </span>
          {!tmdb.tokenConfigured ? (
            <>
              <StatusDot status="error" />
              <span className="text-muted-foreground/50 text-xs">
                Not configured
              </span>
            </>
          ) : tmdb.connected && tmdb.tokenValid ? (
            <>
              <StatusDot status="ok" />
              <span className="text-muted-foreground text-xs">Connected</span>
              <span className="font-mono text-[11px] text-muted-foreground/80">
                {tmdb.responseTimeMs}ms
              </span>
            </>
          ) : tmdb.connected && !tmdb.tokenValid ? (
            <>
              <StatusDot status="error" />
              <span className="text-destructive text-xs">Invalid token</span>
            </>
          ) : (
            <>
              <StatusDot status="error" />
              <span className="text-destructive text-xs">Unreachable</span>
              {tmdb.error && (
                <span className="text-[11px] text-muted-foreground/50">
                  {tmdb.error}
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
            {environment.dataDirWritable ? (
              <IconCheck aria-hidden={true} className="size-3 text-green-500" />
            ) : (
              <IconAlertTriangle
                aria-hidden={true}
                className="size-3 text-destructive"
              />
            )}
          </span>
          <div className="space-y-1">
            {environment.envVars
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

function BackgroundJobsCard({
  jobs,
  isRefreshing,
  onRefresh,
}: Pick<SystemHealthData, "jobs"> & {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const triggerJobMutation = useMutation(
    orpc.admin.triggerJob.mutationOptions({
      onSuccess: (_, { name }) => {
        toast.success(`${JOB_LABELS[name] ?? name} triggered`);
        setTimeout(onRefresh, 1500);
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to trigger job",
        );
      },
    }),
  );
  const triggeringJob = triggerJobMutation.isPending
    ? (triggerJobMutation.variables?.name ?? null)
    : null;

  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
    if (!a.nextRunAt && !b.nextRunAt) return 0;
    if (!a.nextRunAt) return 1;
    if (!b.nextRunAt) return -1;
    return new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime();
  });
  const activeJobs = jobs.filter((j) => !j.disabled);
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
          <RefreshButton isRefreshing={isRefreshing} onRefresh={onRefresh} />
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
                            onClick={() =>
                              triggerJobMutation.mutate({ name: job.jobName })
                            }
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

function StorageCard({
  imageCache,
  backups,
  isRefreshing,
  onRefresh,
}: Pick<SystemHealthData, "imageCache" | "backups"> & {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
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
          <RefreshButton isRefreshing={isRefreshing} onRefresh={onRefresh} />
        </div>
      </CardContent>

      {/* Image cache */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[11px] text-muted-foreground/70 uppercase tracking-wider">
            Image cache
          </span>
          {imageCache.enabled ? (
            <span className="font-mono text-[11px] text-muted-foreground/50">
              {formatBytes(imageCache.totalSizeBytes)}
            </span>
          ) : null}
        </div>
        {imageCache.enabled ? (
          <>
            <p className="mt-1 text-muted-foreground text-xs">
              {imageCache.imageCount.toLocaleString()} cached images
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/50 leading-relaxed">
              {Object.entries(imageCache.categories)
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
          {backups.backupCount > 0 && (
            <span className="font-mono text-[11px] text-muted-foreground/50">
              {formatBytes(backups.totalSizeBytes)}
            </span>
          )}
        </div>
        {backups.backupCount > 0 ? (
          <p
            className="mt-1 text-muted-foreground text-xs"
            suppressHydrationWarning
          >
            {backups.backupCount} backups · last{" "}
            <LiveTimeAgo date={backups.lastBackupAt} fallback="unknown" />
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
