import { Cron } from "croner";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  availabilityOffers,
  cronRuns,
  seasons,
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
import {
  cacheEpisodeStills,
  cacheImagesForTitle,
  cacheProviderLogos,
  imageCacheEnabled,
} from "@/lib/services/image-cache";
import {
  refreshRecommendations,
  refreshTitle,
  refreshTvChildren,
} from "@/lib/services/metadata";
import { getSetting } from "@/lib/services/settings";
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
      const run = db
        .insert(cronRuns)
        .values({ jobName: name, status: "running", startedAt: new Date() })
        .returning()
        .get();
      try {
        await handler();
        db.update(cronRuns)
          .set({ status: "success", finishedAt: new Date() })
          .where(eq(cronRuns.id, run.id))
          .run();
        log.info(`Completed job: ${name}`);
      } catch (err) {
        db.update(cronRuns)
          .set({
            status: "error",
            finishedAt: new Date(),
            errorMessage: err instanceof Error ? err.message : String(err),
          })
          .where(eq(cronRuns.id, run.id))
          .run();
        log.error(`Job ${name} failed:`, err);
      }
    }),
  );
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
  const libraryStale = new Date(Date.now() - 7 * DAY);
  const nonLibraryStale = new Date(Date.now() - 30 * DAY);

  // Library titles: 7 days
  for (const titleId of libraryIds) {
    const t = db
      .select()
      .from(titles)
      .where(
        and(eq(titles.id, titleId), lt(titles.lastFetchedAt, libraryStale)),
      )
      .get();
    if (t) {
      await refreshTitle(titleId);
      await Bun.sleep(RATE_LIMIT_MS);
    }
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
  const stale = new Date(Date.now() - DAY);

  for (const titleId of libraryIds) {
    // Check if any offer is stale
    const offer = db
      .select()
      .from(availabilityOffers)
      .where(
        and(
          eq(availabilityOffers.titleId, titleId),
          lt(availabilityOffers.lastFetchedAt, stale),
        ),
      )
      .get();

    // Also handle titles with no offers yet
    const anyOffer = db
      .select()
      .from(availabilityOffers)
      .where(eq(availabilityOffers.titleId, titleId))
      .get();

    if (offer || !anyOffer) {
      await refreshAvailability(titleId);
      await Bun.sleep(RATE_LIMIT_MS);
    }
  }
}

// Refresh recommendations for recently active titles
async function refreshRecommendationsJob() {
  const libraryIds = getLibraryTitleIds();

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

  for (const show of tvShows) {
    // Check if seasons are stale
    const staleSeason = db
      .select()
      .from(seasons)
      .where(
        and(eq(seasons.titleId, show.id), lt(seasons.lastFetchedAt, stale)),
      )
      .get();

    if (staleSeason) {
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

  for (const titleId of libraryIds) {
    try {
      await cacheImagesForTitle(titleId);
      await cacheEpisodeStills(titleId);
      await cacheProviderLogos(titleId);
    } catch {
      // Continue with remaining titles
    }
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

  log.info(`Started ${jobs.size} jobs`);
}

export function stopJobs() {
  for (const job of jobs.values()) {
    job.stop();
  }
}
