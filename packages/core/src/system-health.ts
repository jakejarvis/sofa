import { access, constants, readdir } from "node:fs/promises";
import path from "node:path";
import { db } from "@sofa/db/client";
import {
  CACHE_DIR,
  DATA_DIR,
  DATABASE_URL,
  TMDB_API_BASE_URL,
} from "@sofa/db/constants";
import { cronRuns, episodes, titles, user } from "@sofa/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { listBackups } from "./backup";
import { imageCacheEnabled } from "./image-cache";
import { getSetting } from "./settings";
import { isUpdateCheckEnabled } from "./update-check";

export interface SystemHealthData {
  database: {
    dbSizeBytes: number;
    walSizeBytes: number;
    titleCount: number;
    episodeCount: number;
    userCount: number;
  };
  tmdb: {
    connected: boolean;
    tokenValid: boolean;
    tokenConfigured: boolean;
    responseTimeMs: number | null;
    error: string | null;
  };
  jobs: {
    jobName: string;
    cronPattern: string | null;
    nextRunAt: string | null;
    lastRunAt: string | null;
    lastDurationMs: number | null;
    lastStatus: "running" | "success" | "error" | null;
    lastError: string | null;
    isCurrentlyRunning: boolean;
    disabled: boolean;
  }[];
  imageCache: {
    enabled: boolean;
    totalSizeBytes: number;
    imageCount: number;
    categories: Record<string, { count: number; sizeBytes: number }>;
  };
  backups: {
    lastBackupAt: string | null;
    lastBackupAgeHours: number | null;
    backupCount: number;
    totalSizeBytes: number;
  };
  environment: {
    dataDir: string;
    dataDirWritable: boolean;
    envVars: { name: string; value: string | null }[];
  };
  checkedAt: string;
}

const JOB_NAMES = [
  "nightlyRefreshLibrary",
  "refreshAvailability",
  "refreshRecommendations",
  "refreshTvChildren",
  "cacheImages",
  "scheduledBackup",
  "updateCheck",
];

function getDatabaseHealth(): SystemHealthData["database"] {
  let dbSizeBytes = 0;
  let walSizeBytes = 0;
  try {
    dbSizeBytes = Bun.file(DATABASE_URL).size;
  } catch {}
  try {
    walSizeBytes = Bun.file(`${DATABASE_URL}-wal`).size;
  } catch {}

  const [titleCount] = db.select({ count: count() }).from(titles).all();
  const [episodeCount] = db.select({ count: count() }).from(episodes).all();
  const [userCount] = db.select({ count: count() }).from(user).all();

  return {
    dbSizeBytes,
    walSizeBytes,
    titleCount: titleCount.count,
    episodeCount: episodeCount.count,
    userCount: userCount.count,
  };
}

async function getTmdbHealth(): Promise<SystemHealthData["tmdb"]> {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) {
    return {
      connected: false,
      tokenValid: false,
      tokenConfigured: false,
      responseTimeMs: null,
      error: null,
    };
  }

  try {
    const start = performance.now();
    const res = await fetch(`${TMDB_API_BASE_URL}/configuration`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    const responseTimeMs = Math.round(performance.now() - start);

    if (res.ok) {
      return {
        connected: true,
        tokenValid: true,
        tokenConfigured: true,
        responseTimeMs,
        error: null,
      };
    }

    return {
      connected: true,
      tokenValid: false,
      tokenConfigured: true,
      responseTimeMs,
      error: `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      connected: false,
      tokenValid: false,
      tokenConfigured: true,
      responseTimeMs: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

type JobSchedule = {
  jobName: string;
  pattern: string;
  nextRunAt: string | null;
};

let _getJobSchedules: (() => JobSchedule[]) | null = null;

/** Register the job schedule provider (called by the API server on startup). */
export function registerJobScheduleProvider(fn: () => JobSchedule[]) {
  _getJobSchedules = fn;
}

function getJobsHealth(): SystemHealthData["jobs"] {
  const schedules = _getJobSchedules?.() ?? [];
  const scheduleMap = new Map(schedules.map((s) => [s.jobName, s]));

  // Fetch only the latest cron run per job (index-optimized LIMIT 1 each)
  const latestByJob = new Map<string, typeof cronRuns.$inferSelect>();
  for (const jobName of JOB_NAMES) {
    const latest = db
      .select()
      .from(cronRuns)
      .where(eq(cronRuns.jobName, jobName))
      .orderBy(desc(cronRuns.startedAt))
      .limit(1)
      .get();
    if (latest) latestByJob.set(jobName, latest);
  }

  return JOB_NAMES.map((jobName) => {
    const latest = latestByJob.get(jobName);
    const isCurrentlyRunning = latest?.status === "running";
    const schedule = scheduleMap.get(jobName);

    // Prefer the in-memory durationMs column; fall back to timestamp diff
    let lastDurationMs: number | null = latest?.durationMs ?? null;
    if (lastDurationMs === null && latest?.finishedAt && latest.startedAt) {
      lastDurationMs = latest.finishedAt.getTime() - latest.startedAt.getTime();
    }

    const disabled =
      (jobName === "scheduledBackup" &&
        getSetting("scheduledBackups") !== "true") ||
      (jobName === "updateCheck" && !isUpdateCheckEnabled());

    return {
      jobName,
      cronPattern: disabled ? null : (schedule?.pattern ?? null),
      nextRunAt: disabled ? null : (schedule?.nextRunAt ?? null),
      lastRunAt:
        latest?.finishedAt?.toISOString() ??
        latest?.startedAt?.toISOString() ??
        null,
      lastDurationMs,
      lastStatus: (latest?.status as "running" | "success" | "error") ?? null,
      lastError: latest?.errorMessage ?? null,
      isCurrentlyRunning,
      disabled,
    };
  });
}

async function getImageCacheHealth(): Promise<SystemHealthData["imageCache"]> {
  const enabled = imageCacheEnabled();
  if (!enabled) {
    return { enabled: false, totalSizeBytes: 0, imageCount: 0, categories: {} };
  }

  const categoryNames = ["posters", "backdrops", "stills", "logos"];
  const categories: Record<string, { count: number; sizeBytes: number }> = {};
  let totalSizeBytes = 0;
  let imageCount = 0;

  await Promise.all(
    categoryNames.map(async (category) => {
      const dir = path.join(CACHE_DIR, category);
      try {
        const files = await readdir(dir);
        const sizes = await Promise.all(
          files.map((file) => Bun.file(path.join(dir, file)).size),
        );
        const sizeBytes = sizes.reduce((sum, s) => sum + s, 0);
        categories[category] = { count: files.length, sizeBytes };
        totalSizeBytes += sizeBytes;
        imageCount += files.length;
      } catch {
        categories[category] = { count: 0, sizeBytes: 0 };
      }
    }),
  );

  return { enabled: true, totalSizeBytes, imageCount, categories };
}

async function getBackupsHealth(): Promise<SystemHealthData["backups"]> {
  try {
    const backups = await listBackups();
    const totalSizeBytes = backups.reduce((sum, b) => sum + b.sizeBytes, 0);
    const lastBackup = backups[0] ?? null;
    const lastBackupAt = lastBackup?.createdAt ?? null;
    const lastBackupAgeHours = lastBackupAt
      ? Math.round(
          (Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60),
        )
      : null;

    return {
      lastBackupAt,
      lastBackupAgeHours,
      backupCount: backups.length,
      totalSizeBytes,
    };
  } catch {
    return {
      lastBackupAt: null,
      lastBackupAgeHours: null,
      backupCount: 0,
      totalSizeBytes: 0,
    };
  }
}

async function getEnvironmentHealth(): Promise<
  SystemHealthData["environment"]
> {
  const resolvedDataDir = path.resolve(DATA_DIR);
  let dataDirWritable = false;
  try {
    await access(resolvedDataDir, constants.W_OK);
    dataDirWritable = true;
  } catch {}

  const redact = (val: string | undefined): string | null => {
    if (!val) return null;
    if (val.length <= 8) return "••••••••";
    return `${val.slice(0, 4)}${"•".repeat(Math.min(val.length - 4, 24))}`;
  };

  const env = (name: string) => process.env[name] ?? null;

  return {
    dataDir: resolvedDataDir,
    dataDirWritable,
    envVars: [
      // Core
      { name: "DATA_DIR", value: resolvedDataDir },
      { name: "LOG_LEVEL", value: env("LOG_LEVEL") ?? "info" },
      // Auth
      { name: "BETTER_AUTH_URL", value: env("BETTER_AUTH_URL") },
      {
        name: "BETTER_AUTH_SECRET",
        value: redact(env("BETTER_AUTH_SECRET") ?? undefined),
      },
      // TMDB
      {
        name: "TMDB_API_READ_ACCESS_TOKEN",
        value: redact(env("TMDB_API_READ_ACCESS_TOKEN") ?? undefined),
      },
      { name: "TMDB_API_BASE_URL", value: env("TMDB_API_BASE_URL") },
      { name: "TMDB_IMAGE_BASE_URL", value: env("TMDB_IMAGE_BASE_URL") },
      // Image cache
      {
        name: "IMAGE_CACHE_ENABLED",
        value: env("IMAGE_CACHE_ENABLED") ?? "true",
      },
      // OIDC
      { name: "OIDC_ISSUER_URL", value: env("OIDC_ISSUER_URL") },
      { name: "OIDC_CLIENT_ID", value: env("OIDC_CLIENT_ID") },
      {
        name: "OIDC_CLIENT_SECRET",
        value: redact(env("OIDC_CLIENT_SECRET") ?? undefined),
      },
      { name: "OIDC_PROVIDER_NAME", value: env("OIDC_PROVIDER_NAME") },
      { name: "OIDC_AUTO_REGISTER", value: env("OIDC_AUTO_REGISTER") },
      { name: "DISABLE_PASSWORD_LOGIN", value: env("DISABLE_PASSWORD_LOGIN") },
    ],
  };
}

export async function getSystemHealth(): Promise<SystemHealthData> {
  const [tmdb, imageCache, backups, environment] = await Promise.all([
    getTmdbHealth(),
    getImageCacheHealth(),
    getBackupsHealth(),
    getEnvironmentHealth(),
  ]);

  return {
    database: getDatabaseHealth(),
    tmdb,
    jobs: getJobsHealth(),
    imageCache,
    backups,
    environment,
    checkedAt: new Date().toISOString(),
  };
}
