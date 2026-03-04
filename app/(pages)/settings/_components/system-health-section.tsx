"use client";

import {
  IconActivity,
  IconClock,
  IconDatabase,
  IconRefresh,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { SystemHealthData } from "@/lib/services/system-health";

const JOB_LABELS: Record<string, string> = {
  nightlyRefreshLibrary: "Library refresh",
  refreshAvailability: "Availability",
  refreshRecommendations: "Recommendations",
  refreshTvChildren: "TV episodes",
  cacheImages: "Image cache",
  scheduledBackup: "Backup",
};

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

/** Small colored status dot */
function StatusDot({
  status,
}: {
  status: "ok" | "error" | "warn" | "inactive";
}) {
  const color = {
    ok: "bg-green-500",
    error: "bg-destructive",
    warn: "bg-amber-500",
    inactive: "bg-muted-foreground/30",
  }[status];
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
    />
  );
}

function SkeletonCards() {
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

/** Renders 3 separate cards: System status, Background jobs, Storage */
export function SystemHealthCards() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/system-health");
      if (!res.ok) throw new Error("Failed to fetch");
      const health: SystemHealthData = await res.json();
      setData(health);
    } catch {
      if (isRefresh) toast.error("Failed to refresh system health");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (loading) return <SkeletonCards />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* ── Card 1: System Status ── */}
      <Card className="border-l-2 border-l-primary/30">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <IconActivity className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle>System status</CardTitle>
                <CardDescription suppressHydrationWarning>
                  Checked{" "}
                  {formatDistanceToNow(new Date(data.checkedAt), {
                    addSuffix: true,
                  })}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchHealth(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Spinner className="size-3" />
              ) : (
                <IconRefresh className="size-3.5" />
              )}
              Refresh
            </Button>
          </div>
        </CardContent>

        {/* Database */}
        <CardContent className="border-t border-border/30 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
              Database
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {formatBytes(data.database.dbSizeBytes)}
              {data.database.walSizeBytes > 0 &&
                ` + ${formatBytes(data.database.walSizeBytes)} WAL`}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.database.titleCount.toLocaleString()} titles
            {" · "}
            {data.database.episodeCount.toLocaleString()} episodes
            {" · "}
            {data.database.userCount.toLocaleString()} users
          </p>
        </CardContent>

        {/* TMDB */}
        <CardContent className="border-t border-border/30 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
              TMDB API
            </span>
            {!data.tmdb.tokenConfigured ? (
              <>
                <StatusDot status="inactive" />
                <span className="text-xs text-muted-foreground/50">
                  Not configured
                </span>
              </>
            ) : data.tmdb.connected && data.tmdb.tokenValid ? (
              <>
                <StatusDot status="ok" />
                <span className="text-xs text-muted-foreground">Connected</span>
                <span className="font-mono text-[11px] text-muted-foreground/40">
                  {data.tmdb.responseTimeMs}ms
                </span>
              </>
            ) : data.tmdb.connected && !data.tmdb.tokenValid ? (
              <>
                <StatusDot status="error" />
                <span className="text-xs text-destructive">Invalid token</span>
              </>
            ) : (
              <>
                <StatusDot status="error" />
                <span className="text-xs text-destructive">Unreachable</span>
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
        <CardContent className="border-t border-border/30 pt-4">
          <div className="space-y-2">
            <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
              Environment
            </span>
            <div className="space-y-1">
              {data.environment.envVars
                .filter((env) => env.value !== null)
                .map((env) => (
                  <div
                    key={env.name}
                    className="flex items-baseline gap-1 font-mono text-[11px] leading-relaxed"
                  >
                    <span className="text-muted-foreground/50">
                      {env.name}=
                    </span>
                    <span className="text-muted-foreground break-all">
                      {env.value}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 2: Background Jobs ── */}
      <Card className="border-l-2 border-l-primary/30">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconClock className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle>Background jobs</CardTitle>
              <CardDescription>
                {data.jobs.filter((j) => j.lastStatus === "success").length} of{" "}
                {data.jobs.length} jobs healthy
              </CardDescription>
            </div>
          </div>
        </CardContent>
        <CardContent className="border-t border-border/30 pt-4">
          <div className="space-y-1.5">
            {data.jobs.map((job) => (
              <div
                key={job.jobName}
                className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2.5 ${
                  job.isCurrentlyRunning ? "animate-pulse" : ""
                }`}
              >
                {job.isCurrentlyRunning ? (
                  <Spinner className="size-2.5" />
                ) : job.lastStatus === null ? (
                  <StatusDot status="inactive" />
                ) : job.lastStatus === "success" ? (
                  <StatusDot status="ok" />
                ) : (
                  <StatusDot status="error" />
                )}

                <span className="text-xs text-muted-foreground">
                  {JOB_LABELS[job.jobName] ?? job.jobName}
                </span>

                {job.lastRunAt ? (
                  <span
                    className="text-right text-[11px] text-muted-foreground/50"
                    suppressHydrationWarning
                  >
                    {formatDistanceToNow(new Date(job.lastRunAt), {
                      addSuffix: true,
                    })}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground/30">
                    —
                  </span>
                )}

                {job.lastDurationMs !== null ? (
                  <span className="w-12 text-right font-mono text-[11px] text-muted-foreground/40">
                    {formatDuration(job.lastDurationMs)}
                  </span>
                ) : (
                  <span className="w-12" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Card 3: Storage ── */}
      <Card className="border-l-2 border-l-primary/30">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconDatabase className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle>Storage</CardTitle>
              <CardDescription>
                Image cache and backup disk usage
              </CardDescription>
            </div>
          </div>
        </CardContent>

        {/* Image cache */}
        <CardContent className="border-t border-border/30 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
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
              <p className="mt-1 text-xs text-muted-foreground">
                {data.imageCache.imageCount.toLocaleString()} cached images
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground/30">
                {Object.entries(data.imageCache.categories)
                  .map(([name, cat]) => `${name} ${cat.count}`)
                  .join(" · ")}
              </p>
            </>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <StatusDot status="inactive" />
              Disabled
            </p>
          )}
        </CardContent>

        {/* Backup summary */}
        <CardContent className="border-t border-border/30 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
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
              className="mt-1 text-xs text-muted-foreground"
              suppressHydrationWarning
            >
              {data.backups.backupCount} backups · last{" "}
              {data.backups.lastBackupAt
                ? formatDistanceToNow(new Date(data.backups.lastBackupAt), {
                    addSuffix: true,
                  })
                : "unknown"}
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <StatusDot status="inactive" />
              No backups yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
