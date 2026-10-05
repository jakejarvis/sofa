import { Cron } from "croner";

import { refreshAvailability } from "@sofa/core/availability";
import { createBackup, ensureBackupDir, pruneBackups } from "@sofa/core/backup";
import { refreshCredits, syncCastProfileThumbHashes } from "@sofa/core/credits";
import {
  completeCronRun,
  failCronRun,
  getLibraryTitleIds,
  getReturningTvShows,
  getLibraryTitlesDueForRefresh,
  getStoredSeasonNumbers,
  getStaleNonLibraryTitlesForRefresh,
  getThumbhashBackfillTitleIds,
  getTitleByIdForCron,
  getTitleIdsCheckedBefore,
  getTitleIdsWithStaleSeasons,
  runIsolated,
  startCronRun,
} from "@sofa/core/cron";
import {
  cacheEpisodeStills,
  cacheImagesForTitle,
  cacheProfilePhotos,
  cacheProviderLogos,
  imageCacheEnabled,
} from "@sofa/core/image-cache";
import {
  refreshRecommendations,
  refreshTitle,
  refreshTvChildren,
  seasonsToRefresh,
  syncTvChildArt,
} from "@sofa/core/metadata";
import { getSetting } from "@sofa/core/settings";
import { performTelemetryReport } from "@sofa/core/telemetry";
import { generateTitleBackdropThumbHash, generateTitlePosterThumbHash } from "@sofa/core/thumbhash";
import { performUpdateCheck } from "@sofa/core/update-check";
import { createLogger } from "@sofa/logger";
import { getTvDetails } from "@sofa/tmdb/client";

export type BackupFrequency = "6h" | "12h" | "1d" | "7d";

const log = createLogger("cron");

const DAY = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MS = 300;

const globalForJobs = globalThis as unknown as {
  cronJobs: Map<string, Cron> | undefined;
};

if (!globalForJobs.cronJobs) {
  globalForJobs.cronJobs = new Map<string, Cron>();
}
const jobs = globalForJobs.cronJobs;

function schedule(name: string, cron: string, handler: () => Promise<void>) {
  jobs.set(
    name,
    new Cron(cron, { name, protect: true }, async () => {
      log.debug(`Running job: ${name}`);
      const startMs = performance.now();
      const run = startCronRun(name);
      try {
        await handler();
        const durationMs = Math.round(performance.now() - startMs);
        completeCronRun(run.id, durationMs);
        log.debug(`Completed job: ${name} (${durationMs}ms)`);
      } catch (err) {
        const durationMs = Math.round(performance.now() - startMs);
        failCronRun(run.id, durationMs, err);
        log.error(`Job ${name} failed:`, err);
      }
    }),
  );
}

/** Get schedule metadata for all registered jobs */
export function getJobSchedules(): {
  jobName: string;
  pattern: string;
  nextRunAt: string | null;
}[] {
  return Array.from(jobs.entries(), ([name, cron]) => ({
    jobName: name,
    pattern: cron.getPattern() ?? "",
    nextRunAt: cron.nextRun()?.toISOString() ?? null,
  }));
}

/** Manually trigger a job by name. Returns false if job not found or already running. */
export async function triggerJob(name: string): Promise<boolean> {
  const job = jobs.get(name);
  if (!job) return false;
  if (job.isBusy()) return false;
  await job.trigger();
  return true;
}

// Refresh titles where lastFetchedAt is stale
async function nightlyRefreshLibrary() {
  const libraryIds = getLibraryTitleIds();
  log.debug(`Checking ${libraryIds.length} library titles for staleness`);
  const nonLibraryStale = new Date(Date.now() - 30 * DAY);

  // Library titles: 7 days, or 60 days for settled (ended/canceled/old) titles
  const dueLibraryIds = getLibraryTitlesDueForRefresh(libraryIds);

  await runIsolated(
    dueLibraryIds,
    async (id) => {
      await refreshTitle(id);
      await Bun.sleep(RATE_LIMIT_MS);
    },
    (id, err) => log.warn(`Failed to refresh title ${id}:`, err),
  );

  // Non-library titles: 30 days
  const nonLibraryIds = getStaleNonLibraryTitlesForRefresh(nonLibraryStale, 50)
    .map((t) => t.id)
    .filter((id) => !libraryIds.includes(id));

  await runIsolated(
    nonLibraryIds,
    async (id) => {
      await refreshTitle(id);
      await Bun.sleep(RATE_LIMIT_MS);
    },
    (id, err) => log.warn(`Failed to refresh title ${id}:`, err),
  );
}

// Refresh availability for library titles where stale
async function refreshAvailabilityJob() {
  const libraryIds = getLibraryTitleIds();
  log.debug(`Checking availability for ${libraryIds.length} library titles`);
  const stale = new Date(Date.now() - DAY);

  const staleIds = getTitleIdsCheckedBefore(libraryIds, "availabilityCheckedAt", stale);

  await runIsolated(
    staleIds,
    async (id) => {
      await refreshAvailability(id);
      await Bun.sleep(RATE_LIMIT_MS);
    },
    (id, err) => log.warn(`Failed to refresh availability for title ${id}:`, err),
  );
}

async function refreshRecommendationsJob() {
  const libraryIds = getLibraryTitleIds();
  const stale = new Date(Date.now() - 7 * DAY);
  const staleIds = getTitleIdsCheckedBefore(libraryIds, "recommendationsCheckedAt", stale);
  log.debug(
    `Refreshing recommendations for ${staleIds.length} of ${libraryIds.length} library titles`,
  );

  await runIsolated(
    staleIds,
    async (id) => {
      await refreshRecommendations(id);
      await Bun.sleep(RATE_LIMIT_MS);
    },
    (id, err) => log.warn(`Failed to refresh recommendations for title ${id}:`, err),
  );
}

async function refreshTvChildrenJob() {
  const stale = new Date(Date.now() - 7 * DAY);

  const libraryIds = new Set(getLibraryTitleIds());
  const tvShows = getReturningTvShows().filter((s) => libraryIds.has(s.id));

  log.debug(`Checking ${tvShows.length} returning TV shows for stale episodes`);

  const tvIds = tvShows.map((s) => s.id);
  const titlesWithStaleSeasons = getTitleIdsWithStaleSeasons(tvIds, stale);

  await runIsolated(
    tvShows.filter((s) => titlesWithStaleSeasons.has(s.id)),
    async (show) => {
      const details = await getTvDetails(show.tmdbId);
      const onlySeasons = seasonsToRefresh(
        details.status ?? null,
        details.number_of_seasons,
        getStoredSeasonNumbers(show.id),
      );
      await refreshTvChildren(show.id, show.tmdbId, details.number_of_seasons, { onlySeasons });
      await syncTvChildArt(show.id, { warmCache: true });
      await Bun.sleep(RATE_LIMIT_MS);
    },
    (show, err) => log.warn(`Failed to refresh episodes for TV show ${show.id}:`, err),
  );
}

async function cacheImagesJob() {
  const titleIds = getThumbhashBackfillTitleIds();
  log.debug(`Caching images for ${titleIds.length} titles needing art backfill`);

  for (const titleId of titleIds) {
    let downloads = 0;
    try {
      const title = getTitleByIdForCron(titleId);
      if (!title) continue;

      // Phase 1: warm the image cache so thumbhash generation can read from disk
      if (imageCacheEnabled()) {
        const counts = await Promise.all([
          cacheImagesForTitle(titleId),
          cacheEpisodeStills(titleId),
          cacheProviderLogos(titleId),
          cacheProfilePhotos(titleId),
        ]);
        downloads = counts.reduce((a, b) => a + b, 0);
      }

      // Phase 2: generate thumbhashes (reads from warm cache, no duplicate downloads)
      const hashTasks: Promise<unknown>[] = [];

      if (!title.posterThumbHash && title.posterPath) {
        hashTasks.push(generateTitlePosterThumbHash(titleId, title.posterPath));
      }
      if (!title.backdropThumbHash && title.backdropPath) {
        hashTasks.push(generateTitleBackdropThumbHash(titleId, title.backdropPath));
      }

      if (title.type === "tv") {
        hashTasks.push(syncTvChildArt(titleId, { warmCache: false }));
      }

      hashTasks.push(syncCastProfileThumbHashes(titleId, undefined, { warmCache: false }));

      await Promise.all(hashTasks);
    } catch (err) {
      log.warn(`Failed to cache images for title ${titleId}:`, err);
    }
    if (downloads > 0) await Bun.sleep(RATE_LIMIT_MS);
  }
}

async function refreshCreditsJob() {
  const libraryIds = getLibraryTitleIds();
  log.debug(`Checking credits for ${libraryIds.length} library titles`);
  const stale = new Date(Date.now() - 30 * DAY);

  for (const titleId of getTitleIdsCheckedBefore(libraryIds, "creditsCheckedAt", stale)) {
    await refreshCredits(titleId);
    await Bun.sleep(RATE_LIMIT_MS);
  }
}

async function scheduledBackupJob() {
  const enabled = getSetting("scheduledBackups");
  if (enabled !== "true") {
    log.debug("Scheduled backups disabled, skipping");
    return;
  }

  await ensureBackupDir();
  await createBackup("sofa-scheduled");

  const maxStr = getSetting("maxBackupRetention");
  const max = maxStr ? Number.parseInt(maxStr, 10) : 7;
  await pruneBackups(max);
}

export function buildBackupCron(
  frequency: BackupFrequency = "1d",
  time = "02:00",
  dayOfWeek = 0,
): string {
  const [hour, minute] = time.split(":").map(Number);
  const h = Number.isFinite(hour) ? hour : 2;
  const m = Number.isFinite(minute) ? minute : 0;
  const dow = dayOfWeek >= 0 && dayOfWeek <= 6 ? dayOfWeek : 0;

  switch (frequency) {
    case "6h":
      return `${m} ${h},${(h + 6) % 24},${(h + 12) % 24},${(h + 18) % 24} * * *`;
    case "12h":
      return `${m} ${h},${(h + 12) % 24} * * *`;
    case "7d":
      return `${m} ${h} * * ${dow}`;
    default:
      return `${m} ${h} * * *`;
  }
}

function getBackupCronFromSettings(): string {
  const frequency = (getSetting("backupScheduleFrequency") ?? "1d") as BackupFrequency;
  const time = getSetting("backupScheduleTime") ?? "02:00";
  const dayOfWeek = Number.parseInt(getSetting("backupScheduleDow") ?? "0", 10);
  return buildBackupCron(frequency, time, dayOfWeek);
}

export function rescheduleBackup() {
  const existing = jobs.get("scheduledBackup");
  if (existing) {
    existing.stop();
    jobs.delete("scheduledBackup");
  }
  const cron = getBackupCronFromSettings();
  log.debug(`Rescheduling backup job with cron: ${cron}`);
  schedule("scheduledBackup", cron, scheduledBackupJob);
}

export function startJobs() {
  if (jobs.size > 0) return;

  schedule("scheduledBackup", getBackupCronFromSettings(), scheduledBackupJob);
  schedule("nightlyRefreshLibrary", "0 3 * * *", nightlyRefreshLibrary);
  schedule("refreshAvailability", "0 */6 * * *", refreshAvailabilityJob);
  schedule("refreshRecommendations", "0 */12 * * *", refreshRecommendationsJob);
  schedule("refreshTvChildren", "30 */12 * * *", refreshTvChildrenJob);
  schedule("cacheImages", "0 1,13 * * *", cacheImagesJob);
  schedule("refreshCredits", "0 2 * * *", refreshCreditsJob);
  schedule("updateCheck", "0 */6 * * *", async () => {
    await performUpdateCheck();
  });
  schedule("telemetryReport", "30 0 * * *", async () => {
    await performTelemetryReport();
  });
  schedule("optimizeDb", "0 4 * * 0", async () => {
    const { optimizeDatabase } = await import("@sofa/db/client");
    const { deleteOldCronRuns } = await import("@sofa/db/queries/cron");
    const { deleteOldIntegrationEvents } = await import("@sofa/db/queries/webhooks");
    const { deleteExpiredSessions, deleteExpiredVerifications } =
      await import("@sofa/db/queries/auth-cleanup");

    const retentionDate = new Date(Date.now() - 30 * DAY);
    const cronDeleted = deleteOldCronRuns(retentionDate);
    const eventsDeleted = deleteOldIntegrationEvents(retentionDate);
    const sessionsDeleted = deleteExpiredSessions();
    const verificationsDeleted = deleteExpiredVerifications();

    if (cronDeleted + eventsDeleted + sessionsDeleted + verificationsDeleted > 0) {
      log.info(
        `Pruned ${cronDeleted} cron runs, ${eventsDeleted} integration events, ${sessionsDeleted} sessions, ${verificationsDeleted} verifications`,
      );
    }

    optimizeDatabase();
  });

  log.debug(`Registered ${jobs.size} scheduled jobs`);
}

export function pauseJobs() {
  for (const job of jobs.values()) {
    job.pause();
  }
}

export function resumeJobs() {
  for (const job of jobs.values()) {
    job.resume();
  }
}

export function stopJobs() {
  for (const job of jobs.values()) {
    job.stop();
  }
}
