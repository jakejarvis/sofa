import { Cron } from "croner";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  availabilityOffers,
  seasons,
  titles,
  userTitleStatus,
} from "@/lib/db/schema";
import { refreshAvailability } from "@/lib/services/availability";
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
import { getTvDetails } from "@/lib/tmdb/client";

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
    new Cron(
      cron,
      {
        name,
        protect: true,
        catch: (err: unknown) => {
          console.error(`[scheduler] Job ${name} failed:`, err);
        },
      },
      async () => {
        console.log(`[scheduler] Running job: ${name}`);
        await handler();
        console.log(`[scheduler] Completed job: ${name}`);
      },
    ),
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getLibraryTitleIds(): Promise<string[]> {
  const rows = await db
    .select({ titleId: userTitleStatus.titleId })
    .from(userTitleStatus)
    .groupBy(userTitleStatus.titleId)
    .all();
  return rows.map((r) => r.titleId);
}

// Refresh titles where lastFetchedAt is stale
async function nightlyRefreshLibrary() {
  const libraryIds = await getLibraryTitleIds();
  const libraryStale = new Date(Date.now() - 7 * DAY);
  const nonLibraryStale = new Date(Date.now() - 30 * DAY);

  // Library titles: 7 days
  for (const titleId of libraryIds) {
    const t = await db
      .select()
      .from(titles)
      .where(
        and(eq(titles.id, titleId), lt(titles.lastFetchedAt, libraryStale)),
      )
      .get();
    if (t) {
      await refreshTitle(titleId);
      await delay(RATE_LIMIT_MS);
    }
  }

  // Non-library titles: 30 days
  const nonLibrary = await db
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
      await delay(RATE_LIMIT_MS);
    }
  }
}

// Refresh availability for library titles where stale
async function refreshAvailabilityJob() {
  const libraryIds = await getLibraryTitleIds();
  const stale = new Date(Date.now() - DAY);

  for (const titleId of libraryIds) {
    // Check if any offer is stale
    const offer = await db
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
    const anyOffer = await db
      .select()
      .from(availabilityOffers)
      .where(eq(availabilityOffers.titleId, titleId))
      .get();

    if (offer || !anyOffer) {
      await refreshAvailability(titleId);
      await delay(RATE_LIMIT_MS);
    }
  }
}

// Refresh recommendations for recently active titles
async function refreshRecommendationsJob() {
  const libraryIds = await getLibraryTitleIds();

  for (const titleId of libraryIds) {
    await refreshRecommendations(titleId);
    await delay(RATE_LIMIT_MS);
  }
}

// Refresh TV episodes for returning shows
async function refreshTvChildrenJob() {
  const returningStatuses = ["Returning Series", "In Production"];
  const stale = new Date(Date.now() - 7 * DAY);

  const tvShows = await db
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
    const staleSeason = await db
      .select()
      .from(seasons)
      .where(
        and(eq(seasons.titleId, show.id), lt(seasons.lastFetchedAt, stale)),
      )
      .get();

    if (staleSeason) {
      const details = await getTvDetails(show.tmdbId);
      await refreshTvChildren(show.id, show.tmdbId, details.number_of_seasons);
      await delay(RATE_LIMIT_MS);
    }
  }
}

// Cache images for all library titles (posters, backdrops, stills, logos)
async function cacheImagesJob() {
  if (!imageCacheEnabled()) return;

  const libraryIds = await getLibraryTitleIds();

  for (const titleId of libraryIds) {
    try {
      await cacheImagesForTitle(titleId);
      await cacheEpisodeStills(titleId);
      await cacheProviderLogos(titleId);
    } catch {
      // Continue with remaining titles
    }
    await delay(RATE_LIMIT_MS);
  }
}

export function startJobs() {
  if (jobs.size > 0) return;

  schedule("nightlyRefreshLibrary", "0 3 * * *", nightlyRefreshLibrary);
  schedule("refreshAvailability", "0 */6 * * *", refreshAvailabilityJob);
  schedule("refreshRecommendations", "0 */12 * * *", refreshRecommendationsJob);
  schedule("refreshTvChildren", "30 */12 * * *", refreshTvChildrenJob);
  schedule("cacheImages", "0 1,13 * * *", cacheImagesJob);

  console.log(`[scheduler] Started ${jobs.size} jobs`);
}

export function stopJobs() {
  for (const job of jobs.values()) {
    job.stop();
  }
}
