import { Cron } from "croner";
import { and, eq, inArray, isNotNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  availabilityOffers,
  cronRuns,
  seasons,
  titleCast,
  titles,
  userTitleStatus,
} from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { refreshAvailability } from "@/lib/services/availability";
import {
  createBackup,
  ensureBackupDir,
  pruneBackups,
} from "@/lib/services/backup";
import { refreshCredits } from "@/lib/services/credits";
import {
  cacheEpisodeStills,
  cacheImagesForTitle,
  cacheProfilePhotos,
  cacheProviderLogos,
  imageCacheEnabled,
} from "@/lib/services/image-cache";
import {
  refreshRecommendations,
  refreshTitle,
  refreshTvChildren,
} from "@/lib/services/metadata";
import { getSetting } from "@/lib/services/settings";
import { performUpdateCheck } from "@/lib/services/update-check";
import { getTvDetails } from "@/lib/tmdb/client";

export type BackupFrequency = "6h" | "12h" | "1d" | "7d";

const log = createLogger("cron");

const DAY = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MS = 300;

const globalForJobs = globalThis as unknown as {
  _jobs: Map<string, Cron> | undefined;
};

if (!globalForJobs._jobs) {
  globalForJobs._jobs = new Map<string, Cron>();
}
const jobs = globalForJobs._jobs;

function schedule(name: string, cron: string, handler: () => Promise<void>) {
  jobs.set(
    name,
    new Cron(cron, { name, protect: true }, async () => {
      log.info(`Running job: ${name}`);
      const startMs = performance.now();
      const run = db
        .insert(cronRuns)
        .values({ jobName: name, status: "running", startedAt: new Date() })
        .returning()
        .get();
      try {
        await handler();
        const durationMs = Math.round(performance.now() - startMs);
        db.update(cronRuns)
          .set({ status: "success", finishedAt: new Date(), durationMs })
          .where(eq(cronRuns.id, run.id))
          .run();
        log.info(`Completed job: ${name} (${durationMs}ms)`);
      } catch (err) {
        const durationMs = Math.round(performance.now() - startMs);
        db.update(cronRuns)
          .set({
            status: "error",
            finishedAt: new Date(),
            durationMs,
            errorMessage: err instanceof Error ? err.message : String(err),
          })
          .where(eq(cronRuns.id, run.id))
          .run();
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
  return Array.from(jobs.entries()).map(([name, cron]) => ({
    jobName: name,
    pattern: cron.getPattern() ?? "",
    nextRunAt: cron.nextRun()?.toISOString() ?? null,
  }));
}

/** Manually trigger a job by name. Returns false if job not found. */
export async function triggerJob(name: string): Promise<boolean> {
  const job = jobs.get(name);
  if (!job) return false;
  await job.trigger();
  return true;
}

function getLibraryTitleIds(): string[] {
  const rows = db
    .select({ titleId: userTitleStatus.titleId })
    .from(userTitleStatus)
    .groupBy(userTitleStatus.titleId)
    .all();
  return rows.map((r) => r.titleId);
}

// Refresh titles where lastFetchedAt is stale
async function nightlyRefreshLibrary() {
  const libraryIds = getLibraryTitleIds();
  log.debug(`Checking ${libraryIds.length} library titles for staleness`);
  const libraryStale = new Date(Date.now() - 7 * DAY);
  const nonLibraryStale = new Date(Date.now() - 30 * DAY);

  // Library titles: 7 days
  const staleLibrary = db
    .select({ id: titles.id })
    .from(titles)
    .where(
      and(
        inArray(titles.id, libraryIds),
        lt(titles.lastFetchedAt, libraryStale),
      ),
    )
    .all();

  for (const { id } of staleLibrary) {
    await refreshTitle(id);
    await Bun.sleep(RATE_LIMIT_MS);
  }

  // Non-library titles: 30 days
  const nonLibrary = db
    .select()
    .from(titles)
    .where(
      and(
        isNotNull(titles.lastFetchedAt),
        lt(titles.lastFetchedAt, nonLibraryStale),
      ),
    )
    .limit(50)
    .all();

  for (const t of nonLibrary) {
    if (!libraryIds.includes(t.id)) {
      await refreshTitle(t.id);
      await Bun.sleep(RATE_LIMIT_MS);
    }
  }
}

// Refresh availability for library titles where stale
async function refreshAvailabilityJob() {
  const libraryIds = getLibraryTitleIds();
  log.debug(`Checking availability for ${libraryIds.length} library titles`);
  const stale = new Date(Date.now() - DAY);

  // Batch: find titles with any offers, and titles with stale offers
  const titlesWithOffers = new Set(
    db
      .select({ titleId: availabilityOffers.titleId })
      .from(availabilityOffers)
      .where(inArray(availabilityOffers.titleId, libraryIds))
      .groupBy(availabilityOffers.titleId)
      .all()
      .map((r) => r.titleId),
  );

  const titlesWithStaleOffers = new Set(
    db
      .select({ titleId: availabilityOffers.titleId })
      .from(availabilityOffers)
      .where(
        and(
          inArray(availabilityOffers.titleId, libraryIds),
          lt(availabilityOffers.lastFetchedAt, stale),
        ),
      )
      .groupBy(availabilityOffers.titleId)
      .all()
      .map((r) => r.titleId),
  );

  for (const titleId of libraryIds) {
    if (titlesWithStaleOffers.has(titleId) || !titlesWithOffers.has(titleId)) {
      await refreshAvailability(titleId);
      await Bun.sleep(RATE_LIMIT_MS);
    }
  }
}

// Refresh recommendations for recently active titles
async function refreshRecommendationsJob() {
  const libraryIds = getLibraryTitleIds();
  log.debug(
    `Refreshing recommendations for ${libraryIds.length} library titles`,
  );

  for (const titleId of libraryIds) {
    await refreshRecommendations(titleId);
    await Bun.sleep(RATE_LIMIT_MS);
  }
}

// Refresh TV episodes for returning shows
async function refreshTvChildrenJob() {
  const returningStatuses = ["Returning Series", "In Production"];
  const stale = new Date(Date.now() - 7 * DAY);

  const tvShows = db
    .select()
    .from(titles)
    .where(
      and(
        eq(titles.type, "tv"),
        isNotNull(titles.lastFetchedAt),
        or(...returningStatuses.map((s) => eq(titles.status, s))),
      ),
    )
    .all();

  log.debug(`Checking ${tvShows.length} returning TV shows for stale episodes`);

  // Batch: find shows with at least one stale season
  const tvIds = tvShows.map((s) => s.id);
  const titlesWithStaleSeasons = new Set(
    tvIds.length > 0
      ? db
          .select({ titleId: seasons.titleId })
          .from(seasons)
          .where(
            and(
              inArray(seasons.titleId, tvIds),
              lt(seasons.lastFetchedAt, stale),
            ),
          )
          .groupBy(seasons.titleId)
          .all()
          .map((r) => r.titleId)
      : [],
  );

  for (const show of tvShows) {
    if (titlesWithStaleSeasons.has(show.id)) {
      const details = await getTvDetails(show.tmdbId);
      await refreshTvChildren(show.id, show.tmdbId, details.number_of_seasons);
      await Bun.sleep(RATE_LIMIT_MS);
    }
  }
}

// Cache images for all library titles (posters, backdrops, stills, logos)
async function cacheImagesJob() {
  if (!imageCacheEnabled()) return;

  const libraryIds = getLibraryTitleIds();
  log.debug(`Caching images for ${libraryIds.length} library titles`);

  for (const titleId of libraryIds) {
    try {
      await Promise.all([
        cacheImagesForTitle(titleId),
        cacheEpisodeStills(titleId),
        cacheProviderLogos(titleId),
        cacheProfilePhotos(titleId),
      ]);
    } catch (err) {
      log.warn(`Failed to cache images for title ${titleId}:`, err);
    }
    await Bun.sleep(RATE_LIMIT_MS);
  }
}

// Refresh credits for library titles where cast is stale or missing
async function refreshCreditsJob() {
  const libraryIds = getLibraryTitleIds();
  log.debug(`Checking credits for ${libraryIds.length} library titles`);
  const stale = new Date(Date.now() - 30 * DAY);

  for (const titleId of libraryIds) {
    const castEntry = db
      .select()
      .from(titleCast)
      .where(eq(titleCast.titleId, titleId))
      .limit(1)
      .get();

    const needsRefresh =
      !castEntry ||
      (castEntry.lastFetchedAt && castEntry.lastFetchedAt < stale);

    if (needsRefresh) {
      await refreshCredits(titleId);
      await Bun.sleep(RATE_LIMIT_MS);
    }
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
      return `${m} */6 * * *`;
    case "12h":
      return `${m} ${h},${(h + 12) % 24} * * *`;
    case "7d":
      return `${m} ${h} * * ${dow}`;
    default:
      return `${m} ${h} * * *`;
  }
}

function getBackupCronFromSettings(): string {
  const frequency = (getSetting("backupScheduleFrequency") ??
    "1d") as BackupFrequency;
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
  log.info(`Rescheduling backup job with cron: ${cron}`);
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

  log.info(`Started ${jobs.size} jobs`);
}

export function stopJobs() {
  for (const job of jobs.values()) {
    job.stop();
  }
}
