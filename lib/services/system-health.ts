import { access, constants, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cronRuns, episodes, titles, user } from "@/lib/db/schema";
import { listBackups } from "@/lib/services/backup";
import { imageCacheEnabled } from "@/lib/services/image-cache";

const DATA_DIR = process.env.DATA_DIR || "./data";
const DATABASE_URL =
  process.env.DATABASE_URL || path.join(DATA_DIR, "sqlite.db");
const CACHE_DIR = process.env.CACHE_DIR
  ? path.join(process.env.CACHE_DIR, "images")
  : path.join(DATA_DIR, "images");
const TMDB_API_BASE_URL =
  process.env.TMDB_API_BASE_URL || "https://api.themoviedb.org/3";

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
    lastRunAt: string | null;
    lastDurationMs: number | null;
    lastStatus: "running" | "success" | "error" | null;
    lastError: string | null;
    isCurrentlyRunning: boolean;
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

function getJobsHealth(): SystemHealthData["jobs"] {
  return JOB_NAMES.map((jobName) => {
    const latest = db
      .select()
      .from(cronRuns)
      .where(eq(cronRuns.jobName, jobName))
      .orderBy(desc(cronRuns.startedAt))
      .limit(1)
      .get();

    const isCurrentlyRunning = latest?.status === "running";

    let lastDurationMs: number | null = null;
    if (latest?.finishedAt && latest.startedAt) {
      lastDurationMs = latest.finishedAt.getTime() - latest.startedAt.getTime();
    }

    return {
      jobName,
      lastRunAt: latest?.startedAt?.toISOString() ?? null,
      lastDurationMs,
      lastStatus: (latest?.status as "running" | "success" | "error") ?? null,
      lastError: latest?.errorMessage ?? null,
      isCurrentlyRunning,
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

  for (const category of categoryNames) {
    const dir = path.join(CACHE_DIR, category);
    try {
      const files = await readdir(dir);
      let sizeBytes = 0;
      for (const file of files) {
        try {
          const s = await stat(path.join(dir, file));
          if (s.isFile()) sizeBytes += s.size;
        } catch {}
      }
      categories[category] = { count: files.length, sizeBytes };
      totalSizeBytes += sizeBytes;
      imageCount += files.length;
    } catch {
      categories[category] = { count: 0, sizeBytes: 0 };
    }
  }

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
