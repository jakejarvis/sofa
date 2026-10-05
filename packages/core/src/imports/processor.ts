import { ORPCError } from "@orpc/server";

import { type ImportJob, NormalizedImportSchema } from "@sofa/api/schemas";
import {
  backdateTitleStatusAddedAt,
  clearFinishedImportPayloads,
  getImportJob,
  getImportJobStatus,
  getImportJobSummary,
  hasEpisodeWatch,
  hasEpisodeWatchBetween,
  hasMovieWatch,
  hasMovieWatchBetween,
  hasRating,
  getTitleStatusValue,
  updateImportJobProgress,
} from "@sofa/db/queries/imports";
import { refreshPlannerStats } from "@sofa/db/queries/maintenance";
import { findEpisodeBySeasonAndNumber, findSeasonByTitleAndNumber } from "@sofa/db/queries/title";
import { createLogger } from "@sofa/logger";
import { getTvDetails } from "@sofa/tmdb/client";

import { getOrFetchTitleByTmdbId, refreshTvChildren } from "../metadata";
import { logEpisodeWatch, logMovieWatch, rateTitleStars, setTitleStatus } from "../tracking";
import type { ImportEpisode, ImportMovie, ImportRating, ImportWatchlistItem } from "./parsers";
import { resolveMovieTmdbId, resolveShowTmdbId } from "./resolve";

const log = createLogger("imports");

/** Two plays of the same item this close together are treated as the same play
 * (e.g. a Plex webhook watch and the same play scrobbled to Trakt). */
const TIMESTAMP_DEDUPE_WINDOW_MS = 3 * 60 * 60 * 1000;

/** Date-only values are stored at server-local noon so stats (which bucket in server-local
 * time) put them on their calendar day. */
function dateOnlyToLocalNoon(day: string): Date {
  return new Date(`${day}T12:00:00`);
}

interface ImportedWatchTime {
  at: Date;
  /** Inclusive [from, to] ranges; an existing watch in any of them is the same play. */
  ranges: Array<[Date, Date]>;
}

function importedWatchTime(item: {
  watchedAt?: string;
  watchedOn?: string;
}): ImportedWatchTime | null {
  if (item.watchedAt) {
    const at = new Date(item.watchedAt);
    if (Number.isNaN(at.getTime())) return null;
    return {
      at,
      ranges: [
        [
          new Date(at.getTime() - TIMESTAMP_DEDUPE_WINDOW_MS),
          new Date(at.getTime() + TIMESTAMP_DEDUPE_WINDOW_MS),
        ],
      ],
    };
  }
  if (item.watchedOn) {
    const start = new Date(`${item.watchedOn}T00:00:00`); // server-local midnight
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    // Imports before this fix stored date-only watches at UTC midnight; match those exactly.
    const legacy = new Date(`${item.watchedOn}T00:00:00Z`);
    return {
      at: dateOnlyToLocalNoon(item.watchedOn),
      ranges: [
        [start, end],
        [legacy, legacy],
      ],
    };
  }
  return null;
}

function safeParseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Types ──────────────────────────────────────────────────────────

export interface ImportOptions {
  importWatches: boolean;
  importWatchlist: boolean;
  importRatings: boolean;
}

/** Per-job state for episode processing. */
interface EpisodeImportContext {
  /** Shows already refreshed from TMDB during this job (refresh at most once per show). */
  refreshedShows: Set<number>;
  specialsSkipped: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

// ─── Item Processors ────────────────────────────────────────────────

async function processMovie(
  userId: string,
  movie: ImportMovie,
  result: ImportResult,
  cache?: Map<string, number | null>,
): Promise<void> {
  const tmdbId = await resolveMovieTmdbId(
    {
      tmdbId: movie.tmdbId,
      imdbId: movie.imdbId,
      title: movie.title,
      year: movie.year,
    },
    cache,
  );

  if (!tmdbId) {
    result.failed++;
    result.errors.push(
      `Could not resolve movie: "${movie.title}"${movie.year ? ` (${movie.year})` : ""}`,
    );
    return;
  }

  const title = await getOrFetchTitleByTmdbId(tmdbId, "movie");
  if (!title) {
    result.failed++;
    result.errors.push(`Failed to fetch metadata for movie TMDB ${tmdbId}`);
    return;
  }

  const time = importedWatchTime(movie);
  const isDuplicate = time
    ? time.ranges.some(([from, to]) => hasMovieWatchBetween(userId, title.id, from, to))
    : hasMovieWatch(userId, title.id); // undated: any existing watch counts
  if (isDuplicate) {
    result.skipped++;
    return;
  }

  logMovieWatch(userId, title.id, "import", time?.at);
  result.imported++;
}

async function processEpisode(
  userId: string,
  ep: ImportEpisode,
  result: ImportResult,
  cache: Map<string, number | null> | undefined,
  ctx: EpisodeImportContext,
): Promise<void> {
  const showTmdbId = await resolveShowTmdbId(
    {
      tmdbId: ep.showTmdbId,
      imdbId: ep.imdbId,
      tvdbId: ep.tvdbId,
      title: ep.showTitle,
      year: ep.year,
    },
    cache,
  );

  if (!showTmdbId) {
    result.failed++;
    result.errors.push(
      `Could not resolve show: "${ep.showTitle ?? "unknown"}" S${ep.seasonNumber}E${ep.episodeNumber}`,
    );
    return;
  }

  const title = await getOrFetchTitleByTmdbId(showTmdbId, "tv");
  if (!title) {
    result.failed++;
    result.errors.push(`Failed to fetch metadata for show TMDB ${showTmdbId}`);
    return;
  }

  let season = findSeasonByTitleAndNumber(title.id, ep.seasonNumber);

  // Sofa doesn't store specials (season 0) — skip them without an error line.
  if (!season && ep.seasonNumber === 0) {
    result.skipped++;
    ctx.specialsSkipped++;
    return;
  }

  let episode = season ? findEpisodeBySeasonAndNumber(season.id, ep.episodeNumber) : undefined;

  // The season/episode may have aired after our last TMDB fetch — refresh the show once per job.
  if (!episode && !ctx.refreshedShows.has(showTmdbId)) {
    ctx.refreshedShows.add(showTmdbId);
    try {
      const show = await getTvDetails(showTmdbId);
      await refreshTvChildren(title.id, showTmdbId, show.number_of_seasons);
      season = findSeasonByTitleAndNumber(title.id, ep.seasonNumber);
      episode = season ? findEpisodeBySeasonAndNumber(season.id, ep.episodeNumber) : undefined;
    } catch (err) {
      log.warn(`Failed to refresh seasons for TMDB ${showTmdbId}:`, err);
    }
  }

  if (!season) {
    result.failed++;
    result.errors.push(`Season ${ep.seasonNumber} not found for "${title.title}"`);
    return;
  }

  if (!episode) {
    result.failed++;
    result.errors.push(`S${ep.seasonNumber}E${ep.episodeNumber} not found for "${title.title}"`);
    return;
  }

  const found = episode;
  const time = importedWatchTime(ep);
  const isDuplicate = time
    ? time.ranges.some(([from, to]) => hasEpisodeWatchBetween(userId, found.id, from, to))
    : hasEpisodeWatch(userId, found.id); // undated: any existing watch counts
  if (isDuplicate) {
    result.skipped++;
    return;
  }

  logEpisodeWatch(userId, found.id, "import", time?.at);
  result.imported++;
}

async function processWatchlistItem(
  userId: string,
  item: ImportWatchlistItem,
  result: ImportResult,
  cache?: Map<string, number | null>,
): Promise<void> {
  const resolveFn = item.type === "movie" ? resolveMovieTmdbId : resolveShowTmdbId;
  const tmdbId = await resolveFn(
    {
      tmdbId: item.tmdbId,
      imdbId: item.imdbId,
      tvdbId: item.tvdbId,
      title: item.title,
      year: item.year,
    },
    cache,
  );

  if (!tmdbId) {
    result.failed++;
    result.errors.push(
      `Could not resolve watchlist item: "${item.title}"${item.year ? ` (${item.year})` : ""}`,
    );
    return;
  }

  const title = await getOrFetchTitleByTmdbId(tmdbId, item.type);
  if (!title) {
    result.failed++;
    result.errors.push(`Failed to fetch metadata for ${item.type} TMDB ${tmdbId}`);
    return;
  }

  const STATUS_RANK = { watchlist: 0, in_progress: 1, completed: 2 } as const;
  // Stored-status invariants (see migration sour_harry_osborn): TV never stores
  // 'completed' (derived from episode progress) and movies never store 'in_progress'.
  const requested = item.status ?? "watchlist";
  const targetStatus =
    title.type === "tv" && requested === "completed"
      ? "in_progress"
      : title.type === "movie" && requested === "in_progress"
        ? "watchlist"
        : requested;
  const currentStatus = getTitleStatusValue(userId, title.id);
  const parsedAddedAt = item.addedAt ? new Date(item.addedAt) : undefined;
  const addedAt =
    parsedAddedAt && !Number.isNaN(parsedAddedAt.getTime()) ? parsedAddedAt : undefined;

  if (currentStatus && STATUS_RANK[currentStatus] >= STATUS_RANK[targetStatus]) {
    if (addedAt) backdateTitleStatusAddedAt(userId, title.id, addedAt);
    result.skipped++;
    return;
  }

  setTitleStatus(userId, title.id, targetStatus, "import", addedAt);
  if (addedAt) backdateTitleStatusAddedAt(userId, title.id, addedAt);
  result.imported++;
}

async function processRating(
  userId: string,
  item: ImportRating,
  result: ImportResult,
  cache?: Map<string, number | null>,
): Promise<void> {
  const resolveFn = item.type === "movie" ? resolveMovieTmdbId : resolveShowTmdbId;
  const tmdbId = await resolveFn(
    {
      tmdbId: item.tmdbId,
      imdbId: item.imdbId,
      tvdbId: item.tvdbId,
      title: item.title,
      year: item.year,
    },
    cache,
  );

  if (!tmdbId) {
    result.failed++;
    result.errors.push(
      `Could not resolve rating item: "${item.title}"${item.year ? ` (${item.year})` : ""}`,
    );
    return;
  }

  const title = await getOrFetchTitleByTmdbId(tmdbId, item.type);
  if (!title) {
    result.failed++;
    result.errors.push(`Failed to fetch metadata for ${item.type} TMDB ${tmdbId}`);
    return;
  }

  if (hasRating(userId, title.id)) {
    result.skipped++;
    return;
  }

  const ratedAt = item.ratedAt
    ? new Date(item.ratedAt)
    : item.ratedOn
      ? dateOnlyToLocalNoon(item.ratedOn)
      : undefined;
  rateTitleStars(userId, title.id, item.rating, ratedAt);
  result.imported++;
}

// ─── Read Job Helper ─────────────────────────────────────────────────

export function readImportJob(jobId: string, userId?: string): ImportJob {
  const row = getImportJobSummary(jobId);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: `Import job ${jobId} not found` });
  }

  if (userId && row.userId !== userId) {
    throw new ORPCError("FORBIDDEN", { message: "Not authorized" });
  }

  return {
    id: row.id,
    source: row.source as ImportJob["source"],
    status: row.status as ImportJob["status"],
    totalItems: row.totalItems,
    processedItems: row.processedItems,
    importedCount: row.importedCount,
    skippedCount: row.skippedCount,
    failedCount: row.failedCount,
    currentMessage: row.currentMessage,
    errors: safeParseJsonArray(row.errors),
    warnings: safeParseJsonArray(row.warnings),
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
  };
}

// ─── Job Processor ───────────────────────────────────────────────────

export async function processImportJob(jobId: string): Promise<void> {
  try {
    await runImportJob(jobId);
  } finally {
    try {
      clearFinishedImportPayloads(jobId);
    } catch (err) {
      log.warn(`Failed to clear payload for import job ${jobId}:`, err);
    }
  }
}

async function runImportJob(jobId: string): Promise<void> {
  const row = getImportJob(jobId);

  if (!row) {
    log.error(`Import job ${jobId} not found`);
    return;
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(row.payload);
  } catch {
    updateImportJobProgress(jobId, {
      status: "error",
      finishedAt: new Date(),
      errors: JSON.stringify([`Import job ${jobId} has invalid JSON payload`]),
      currentMessage: "Import failed",
    });
    log.error(`Import job ${jobId} has invalid JSON payload`);
    return;
  }
  const parsed = NormalizedImportSchema.safeParse(rawPayload);
  if (!parsed.success) {
    updateImportJobProgress(jobId, {
      status: "error",
      finishedAt: new Date(),
      errors: JSON.stringify([`Malformed payload: ${parsed.error.message}`]),
      currentMessage: "Import failed",
    });
    log.error(`Import job ${jobId} has malformed payload: ${parsed.error.message}`);
    return;
  }
  const data = parsed.data;
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  const finishCancelled = (processed: number) => {
    updateImportJobProgress(jobId, {
      finishedAt: new Date(),
      processedItems: processed,
      importedCount: result.imported,
      skippedCount: result.skipped,
      failedCount: result.failed,
      errors: JSON.stringify(result.errors),
      warnings: JSON.stringify(result.warnings),
      currentMessage: "Import cancelled",
    });
    log.info(`Import job ${jobId} cancelled by user`);
  };

  try {
    // Build item list based on options
    const items: { type: string; index: number }[] = [];

    if (row.importWatches) {
      for (let i = 0; i < data.movies.length; i++) {
        items.push({ type: "movie", index: i });
      }
      for (let i = 0; i < data.episodes.length; i++) {
        items.push({ type: "episode", index: i });
      }
    }
    if (row.importWatchlist) {
      for (let i = 0; i < data.watchlist.length; i++) {
        items.push({ type: "watchlist", index: i });
      }
    }
    if (row.importRatings) {
      for (let i = 0; i < data.ratings.length; i++) {
        items.push({ type: "rating", index: i });
      }
    }

    const total = items.length;

    if (total === 0) {
      result.warnings.push("No items to import with the selected options.");
      updateImportJobProgress(jobId, {
        status: "success",
        finishedAt: new Date(),
        totalItems: 0,
        warnings: JSON.stringify(result.warnings),
      });
      return;
    }

    // Check if the job was cancelled while we were preparing
    const preStartStatus = getImportJobStatus(jobId);
    if (preStartStatus?.status === "cancelled") {
      updateImportJobProgress(jobId, {
        finishedAt: new Date(),
        totalItems: total,
        currentMessage: "Import cancelled",
      });
      log.info(`Import job ${jobId} was cancelled before processing started`);
      return;
    }

    // Set status to running + totalItems atomically
    updateImportJobProgress(jobId, {
      status: "running",
      startedAt: new Date(),
      totalItems: total,
    });

    log.info(`Starting ${data.source} import job ${jobId} for user ${row.userId}: ${total} items`);

    // Shared resolution cache for the entire import job
    const resolveCache = new Map<string, number | null>();
    const episodeCtx: EpisodeImportContext = { refreshedShows: new Set(), specialsSkipped: 0 };

    const progressInterval = 4;
    for (let i = 0; i < items.length; i++) {
      // Check for cancellation periodically
      if (i % progressInterval === 0) {
        const currentStatus = getImportJobStatus(jobId);
        if (currentStatus?.status === "cancelled") {
          finishCancelled(i);
          return;
        }
      }

      const item = items[i];
      try {
        switch (item.type) {
          case "movie":
            await processMovie(row.userId, data.movies[item.index], result, resolveCache);
            break;
          case "episode":
            await processEpisode(
              row.userId,
              data.episodes[item.index],
              result,
              resolveCache,
              episodeCtx,
            );
            break;
          case "watchlist":
            await processWatchlistItem(
              row.userId,
              data.watchlist[item.index],
              result,
              resolveCache,
            );
            break;
          case "rating":
            await processRating(row.userId, data.ratings[item.index], result, resolveCache);
            break;
        }
      } catch (err) {
        result.failed++;
        result.errors.push(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Update DB progress periodically
      if (i % progressInterval === progressInterval - 1 || i === items.length - 1) {
        const currentItem =
          item.type === "movie"
            ? data.movies[item.index]
            : item.type === "episode"
              ? data.episodes[item.index]
              : item.type === "watchlist"
                ? data.watchlist[item.index]
                : data.ratings[item.index];
        const label =
          "title" in currentItem
            ? currentItem.title
            : "showTitle" in currentItem
              ? (currentItem.showTitle ?? "Unknown")
              : "Unknown";

        updateImportJobProgress(jobId, {
          processedItems: i + 1,
          importedCount: result.imported,
          skippedCount: result.skipped,
          failedCount: result.failed,
          currentMessage: label,
        });
      }
    }

    if (episodeCtx.specialsSkipped > 0) {
      result.warnings.push(
        `Skipped ${episodeCtx.specialsSkipped} special episode(s) (season 0) — Sofa doesn't track specials`,
      );
    }

    // A cancel may have arrived after the last periodic check. This check and the
    // success write below are synchronous (no await), so they cannot race.
    if (getImportJobStatus(jobId)?.status === "cancelled") {
      finishCancelled(total);
      return;
    }

    // Success
    updateImportJobProgress(jobId, {
      status: "success",
      finishedAt: new Date(),
      processedItems: total,
      importedCount: result.imported,
      skippedCount: result.skipped,
      failedCount: result.failed,
      errors: JSON.stringify(result.errors),
      warnings: JSON.stringify(result.warnings),
      currentMessage: "Import complete",
    });

    try {
      refreshPlannerStats();
    } catch (err) {
      log.warn("Failed to refresh planner statistics after import:", err);
    }

    log.info(
      `Import job ${jobId} complete: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`,
    );
  } catch (err) {
    // A cancelled job must not be rewritten to "error"
    if (getImportJobStatus(jobId)?.status === "cancelled") {
      finishCancelled(result.imported + result.skipped + result.failed);
      return;
    }

    // Fatal error
    result.errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
    updateImportJobProgress(jobId, {
      status: "error",
      finishedAt: new Date(),
      errors: JSON.stringify(result.errors),
      warnings: JSON.stringify(result.warnings),
      currentMessage: "Import failed",
    });

    log.error(`Import job ${jobId} failed:`, err);
  }
}
