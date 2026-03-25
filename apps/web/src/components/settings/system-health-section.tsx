import { msg, plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
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
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTimeAgo } from "@/hooks/use-time-ago";
import { orpc } from "@/lib/orpc/client";
import type { CronJobName, SystemHealthData } from "@sofa/api/schemas";
import { i18n } from "@sofa/i18n";

const DIGITS_ONLY_RE = /^\d+$/;

/** Convert a cron pattern to a short human-readable string */
function cronToHuman(pattern: string): string {
  const parts = pattern.split(" ");
  if (parts.length !== 5) return pattern;
  const [min, hour, _dom, _mon, dow] = parts;

  // Every N hours: "0 */6 * * *"
  if (hour.startsWith("*/")) {
    const n = Number.parseInt(hour.slice(2), 10);
    return i18n._(msg`Every ${n}h`);
  }

  // Twice daily: "0 1,13 * * *"
  if (hour.includes(",") && !hour.includes("/") && !hour.includes("-")) {
    const hours = hour.split(",");
    if (hours.length === 2) {
      const times = hours.map((h) => `${h.padStart(2, "0")}:${min.padStart(2, "0")}`).join(", ");
      return i18n._(msg`Daily at ${times}`);
    }
  }

  // Daily at specific time: "0 3 * * *"
  if (DIGITS_ONLY_RE.test(hour) && DIGITS_ONLY_RE.test(min) && dow === "*") {
    const time = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
    return i18n._(msg`Daily at ${time}`);
  }

  // Weekly — use Intl for locale-aware day name
  if (DIGITS_ONLY_RE.test(dow)) {
    const dayDate = new Date(2024, 0, 7 + Number(dow)); // 2024-01-07 is a Sunday
    const dayName = new Intl.DateTimeFormat(i18n.locale, { weekday: "short" }).format(dayDate);
    return i18n._(msg`Weekly on ${dayName}`);
  }

  return pattern;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <Card key={s} className="border-s-primary/30 border-s-2">
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
  return <span suppressHydrationWarning>{text}</span>;
}

/** Hydrates system health state and renders the 3 cards */
export function SystemHealthCards() {
  const queryClient = useQueryClient();
  const { data, isPending, isFetching } = useQuery(orpc.admin.systemHealth.queryOptions());
  const isRefreshing = isFetching;
  const refresh = () => queryClient.invalidateQueries({ queryKey: orpc.admin.systemHealth.key() });

  if (isPending || !data) return <SkeletonCards />;

  return (
    <div className="space-y-2.5">
      <SystemStatusCard
        checkedAt={data.checkedAt}
        database={data.database}
        tmdb={data.tmdb}
        environment={data.environment}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />
      <BackgroundJobsCard jobs={data.jobs} isRefreshing={isRefreshing} onRefresh={refresh} />
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
  const { t } = useLingui();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t`Refresh system health`}
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-muted-foreground"
          />
        }
      >
        {isRefreshing ? <Spinner /> : <IconRefresh />}
      </TooltipTrigger>
      <TooltipContent>
        <Trans>Refresh</Trans>
      </TooltipContent>
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
    <Card className="border-s-primary/30 border-s-2">
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <IconActivity aria-hidden={true} className="text-primary size-4" />
            </div>
            <div>
              <CardTitle>
                <Trans>Health status</Trans>
              </CardTitle>
              <CardDescription>
                <Trans>
                  Checked <LiveTimeAgo date={checkedAt} />
                </Trans>
              </CardDescription>
            </div>
          </div>
          <RefreshButton isRefreshing={isRefreshing} onRefresh={onRefresh} />
        </div>
      </CardContent>

      {/* Database */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/70 text-[11px] font-medium tracking-wider uppercase">
            <Trans>Database</Trans>
          </span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {formatBytes(database.dbSizeBytes)}
            {database.walSizeBytes > 0 && ` + ${formatBytes(database.walSizeBytes)} WAL`}
          </span>
        </div>
      </CardContent>

      {/* TMDB */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/70 text-[11px] font-medium tracking-wider uppercase">
            TMDB API
          </span>
          {!tmdb.tokenConfigured ? (
            <>
              <StatusDot status="error" />
              <span className="text-muted-foreground/50 text-xs">
                <Trans>Not configured</Trans>
              </span>
            </>
          ) : tmdb.connected && tmdb.tokenValid ? (
            <>
              <StatusDot status="ok" />
              <span className="text-muted-foreground text-xs">
                <Trans>Connected</Trans>
              </span>
              <span className="text-muted-foreground/80 font-mono text-[11px]">
                {tmdb.responseTimeMs}ms
              </span>
            </>
          ) : tmdb.connected && !tmdb.tokenValid ? (
            <>
              <StatusDot status="error" />
              <span className="text-destructive text-xs">
                <Trans>Invalid token</Trans>
              </span>
            </>
          ) : (
            <>
              <StatusDot status="error" />
              <span className="text-destructive text-xs">
                <Trans>Unreachable</Trans>
              </span>
              {tmdb.error && (
                <span className="text-muted-foreground/50 text-[11px]">{tmdb.error}</span>
              )}
            </>
          )}
        </div>
      </CardContent>

      {/* Environment */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="space-y-2">
          <span className="text-muted-foreground/70 inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
            <Trans>Environment</Trans>
            {environment.dataDirWritable ? (
              <IconCheck aria-hidden={true} className="size-3 text-green-500" />
            ) : (
              <IconAlertTriangle aria-hidden={true} className="text-destructive size-3" />
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
                  <span className="text-muted-foreground break-all">{env.value}</span>
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
  const { t } = useLingui();

  const JOB_LABELS: Record<string, string> = {
    nightlyRefreshLibrary: t`Library refresh`,
    refreshAvailability: t`Availability`,
    refreshRecommendations: t`Recommendations`,
    refreshTvChildren: t`TV episodes`,
    cacheImages: t`Image cache`,
    scheduledBackup: t`Backup`,
    updateCheck: t`Update check`,
  };

  const triggerJobMutation = useMutation(
    orpc.admin.triggerJob.mutationOptions({
      onSuccess: (_, { name }) => {
        const jobLabel = JOB_LABELS[name] ?? name;
        toast.success(t`${jobLabel} triggered`);
        setTimeout(onRefresh, 1500);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t`Failed to trigger job`);
      },
    }),
  );
  const triggeringJob = triggerJobMutation.isPending
    ? (triggerJobMutation.variables?.name ?? null)
    : null;

  const sortedJobs = jobs.toSorted((a, b) => {
    if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
    if (!a.nextRunAt && !b.nextRunAt) return 0;
    if (!a.nextRunAt) return 1;
    if (!b.nextRunAt) return -1;
    return new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime();
  });
  const activeJobs = jobs.filter((j) => !j.disabled);
  const healthyCount = activeJobs.filter((j) => j.lastStatus === "success").length;
  const activeJobCount = activeJobs.length;

  return (
    <Card className="border-s-primary/30 border-s-2">
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <IconCalendarCheck aria-hidden={true} className="text-primary size-4" />
            </div>
            <div>
              <CardTitle>
                <Trans>Background jobs</Trans>
              </CardTitle>
              <CardDescription>
                <Trans>
                  {healthyCount} of {activeJobCount} jobs healthy
                </Trans>
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
              <TableHead className="text-muted-foreground h-8 ps-5 text-[10px] font-medium tracking-wider uppercase">
                <Trans>Job</Trans>
              </TableHead>
              <TableHead className="text-muted-foreground h-8 text-[10px] font-medium tracking-wider uppercase">
                <Trans>Schedule</Trans>
              </TableHead>
              <TableHead className="text-muted-foreground h-8 text-[10px] font-medium tracking-wider uppercase">
                <Trans>Last run</Trans>
              </TableHead>
              <TableHead className="text-muted-foreground h-8 text-[10px] font-medium tracking-wider uppercase">
                <Trans>Next run</Trans>
              </TableHead>
              <TableHead className="text-muted-foreground h-8 pe-5 text-end text-[10px] font-medium tracking-wider uppercase">
                <span className="sr-only">
                  <Trans>Actions</Trans>
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedJobs.map((job) => {
              const isTriggering = triggeringJob === job.jobName;
              const isRunning = job.isCurrentlyRunning || isTriggering;

              return (
                <TableRow key={job.jobName} className="border-b-border/20 hover:bg-muted/30">
                  {/* Job name + status */}
                  <TableCell className="ps-5">
                    <div className="flex items-center gap-2">
                      {job.disabled ? (
                        <StatusDot status="inactive" label={t`Disabled`} />
                      ) : isRunning ? (
                        <Spinner className="size-2.5" />
                      ) : job.lastStatus === null ? (
                        <StatusDot status="warn" label={t`Never run`} />
                      ) : job.lastStatus === "success" ? (
                        <StatusDot status="ok" label={t`Last run succeeded`} />
                      ) : (
                        <StatusDot status="error" label={job.lastError ?? t`Last run failed`} />
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
                      <span className="text-muted-foreground/50 text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Last run */}
                  <TableCell>
                    {job.lastRunAt ? (
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-muted-foreground/80 text-xs">
                              <LiveTimeAgo date={job.lastRunAt} />
                            </span>
                            {job.lastDurationMs !== null && job.lastDurationMs > 0 && (
                              <span className="text-muted-foreground/50 font-mono text-[10px]">
                                {formatDuration(job.lastDurationMs)}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {new Date(job.lastRunAt).toLocaleString()}
                          {job.lastError && (
                            <div className="text-destructive mt-1">{job.lastError}</div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">
                        <Trans>Never</Trans>
                      </span>
                    )}
                  </TableCell>

                  {/* Next run */}
                  <TableCell>
                    {job.nextRunAt ? (
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">
                          <span className="text-muted-foreground/80 text-xs">
                            <LiveTimeAgo date={job.nextRunAt} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{new Date(job.nextRunAt).toLocaleString()}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Trigger button */}
                  <TableCell className="pe-5 text-end">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t`Trigger job`}
                            className="size-6"
                            disabled={isRunning || job.disabled}
                            onClick={() =>
                              triggerJobMutation.mutate({
                                name: job.jobName as CronJobName,
                              })
                            }
                          />
                        }
                      >
                        {isRunning ? (
                          <Spinner className="size-3" />
                        ) : (
                          <IconPlayerPlay
                            aria-hidden={true}
                            className="text-muted-foreground/70 size-3"
                          />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        <Trans>Run now</Trans>
                      </TooltipContent>
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
  const { t } = useLingui();
  const cachedImageCount = imageCache.imageCount;
  const backupCount = backups.backupCount;
  const lastBackupAt = backups.lastBackupAt;
  return (
    <Card className="border-s-primary/30 border-s-2">
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <IconDatabase aria-hidden={true} className="text-primary size-4" />
            </div>
            <div>
              <CardTitle>
                <Trans>Storage</Trans>
              </CardTitle>
              <CardDescription>
                <Trans>Image cache and backup disk usage</Trans>
              </CardDescription>
            </div>
          </div>
          <RefreshButton isRefreshing={isRefreshing} onRefresh={onRefresh} />
        </div>
      </CardContent>

      {/* Image cache */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/70 text-[11px] font-medium tracking-wider uppercase">
            <Trans>Image cache</Trans>
          </span>
          {imageCache.enabled ? (
            <span className="text-muted-foreground/50 font-mono text-[11px]">
              {formatBytes(imageCache.totalSizeBytes)}
            </span>
          ) : null}
        </div>
        {imageCache.enabled ? (
          <>
            <p className="text-muted-foreground mt-1 text-xs">
              {plural(cachedImageCount, { one: "# cached image", other: "# cached images" })}
            </p>
            <p className="text-muted-foreground/50 mt-0.5 text-[10px] leading-relaxed">
              {Object.entries(imageCache.categories)
                .map(([name, cat]) => `${name} ${cat.count}`)
                .join(" · ")}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground/50 mt-1 flex items-center gap-1.5 text-xs">
            <StatusDot status="inactive" />
            <Trans>Disabled</Trans>
          </p>
        )}
      </CardContent>

      {/* Backup summary */}
      <CardContent className="border-border/30 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/70 text-[11px] font-medium tracking-wider uppercase">
            <Trans>Backups</Trans>
          </span>
          {backupCount > 0 && (
            <span className="text-muted-foreground/50 font-mono text-[11px]">
              {formatBytes(backups.totalSizeBytes)}
            </span>
          )}
        </div>
        {backupCount > 0 ? (
          <p className="text-muted-foreground mt-1 text-xs">
            {plural(backupCount, { one: "# backup", other: "# backups" })}
            {" · "}
            <Trans>
              last <LiveTimeAgo date={lastBackupAt} fallback={t`unknown`} />
            </Trans>
          </p>
        ) : (
          <p className="text-muted-foreground/50 mt-1 flex items-center gap-1.5 text-xs">
            <StatusDot status="inactive" />
            <Trans>No backups yet</Trans>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
