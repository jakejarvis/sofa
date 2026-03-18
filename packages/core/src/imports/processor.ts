import { type ImportJob, NormalizedImportSchema } from "@sofa/api/schemas";
import { db } from "@sofa/db/client";
import { and, eq } from "@sofa/db/helpers";
import {
  episodes,
  importJobs,
  seasons,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "@sofa/db/schema";
import { createLogger } from "@sofa/logger";

import { getOrFetchTitleByTmdbId } from "../metadata";
import { logEpisodeWatch, logMovieWatch, rateTitleStars, setTitleStatus } from "../tracking";

import type { ImportEpisode, ImportMovie, ImportRating, ImportWatchlistItem } from "./parsers";
import { resolveMovieTmdbId, resolveShowTmdbId } from "./resolve";

const log = createLogger("imports");

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

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

// ─── Deduplication ──────────────────────────────────────────────────

function hasExistingMovieWatch(userId: string, titleId: string): boolean {
  const existing = db
    .select({ id: userMovieWatches.id })
    .from(userMovieWatches)
    .where(and(eq(userMovieWatches.userId, userId), eq(userMovieWatches.titleId, titleId)))
    .get();
  return !!existing;
}

function hasExistingEpisodeWatch(userId: string, episodeId: string): boolean {
  const existing = db
    .select({ id: userEpisodeWatches.id })
    .from(userEpisodeWatches)
    .where(and(eq(userEpisodeWatches.userId, userId), eq(userEpisodeWatches.episodeId, episodeId)))
    .get();
  return !!existing;
}

function hasExistingWatchlistStatus(userId: string, titleId: string): boolean {
  const existing = db
    .select({ status: userTitleStatus.status })
    .from(userTitleStatus)
    .where(and(eq(userTitleStatus.userId, userId), eq(userTitleStatus.titleId, titleId)))
    .get();
  return !!existing;
}

function hasExistingRating(userId: string, titleId: string): boolean {
  const existing = db
    .select({ ratingStars: userRatings.ratingStars })
    .from(userRatings)
    .where(and(eq(userRatings.userId, userId), eq(userRatings.titleId, titleId)))
    .get();
  return !!existing;
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

  if (hasExistingMovieWatch(userId, title.id)) {
    result.skipped++;
    return;
  }

  const watchedAt = movie.watchedAt
    ? new Date(movie.watchedAt)
    : movie.watchedOn
      ? new Date(movie.watchedOn)
      : undefined;
  logMovieWatch(userId, title.id, "import", watchedAt);
  result.imported++;
}

async function processEpisode(
  userId: string,
  ep: ImportEpisode,
  result: ImportResult,
  cache?: Map<string, number | null>,
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

  // Find the specific episode in our DB
  const season = db
    .select()
    .from(seasons)
    .where(and(eq(seasons.titleId, title.id), eq(seasons.seasonNumber, ep.seasonNumber)))
    .get();

  if (!season) {
    result.failed++;
    result.errors.push(`Season ${ep.seasonNumber} not found for "${title.title}"`);
    return;
  }

  const episode = db
    .select()
    .from(episodes)
    .where(and(eq(episodes.seasonId, season.id), eq(episodes.episodeNumber, ep.episodeNumber)))
    .get();

  if (!episode) {
    result.failed++;
    result.errors.push(`S${ep.seasonNumber}E${ep.episodeNumber} not found for "${title.title}"`);
    return;
  }

  if (hasExistingEpisodeWatch(userId, episode.id)) {
    result.skipped++;
    return;
  }

  const watchedAt = ep.watchedAt
    ? new Date(ep.watchedAt)
    : ep.watchedOn
      ? new Date(ep.watchedOn)
      : undefined;
  logEpisodeWatch(userId, episode.id, "import", watchedAt);
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

  if (hasExistingWatchlistStatus(userId, title.id)) {
    result.skipped++;
    return;
  }

  setTitleStatus(userId, title.id, "watchlist", "import");
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

  if (hasExistingRating(userId, title.id)) {
    result.skipped++;
    return;
  }

  const ratedAt = item.ratedAt
    ? new Date(item.ratedAt)
    : item.ratedOn
      ? new Date(item.ratedOn)
      : undefined;
  rateTitleStars(userId, title.id, item.rating, ratedAt);
  result.imported++;
}

// ─── Read Job Helper ─────────────────────────────────────────────────

export function readImportJob(jobId: string, userId?: string): ImportJob {
  const row = db
    .select({
      id: importJobs.id,
      userId: importJobs.userId,
      source: importJobs.source,
      status: importJobs.status,
      totalItems: importJobs.totalItems,
      processedItems: importJobs.processedItems,
      importedCount: importJobs.importedCount,
      skippedCount: importJobs.skippedCount,
      failedCount: importJobs.failedCount,
      currentMessage: importJobs.currentMessage,
      errors: importJobs.errors,
      warnings: importJobs.warnings,
      createdAt: importJobs.createdAt,
      startedAt: importJobs.startedAt,
      finishedAt: importJobs.finishedAt,
    })
    .from(importJobs)
    .where(eq(importJobs.id, jobId))
    .get();

  if (!row) {
    throw new Error(`Import job ${jobId} not found`);
  }

  if (userId && row.userId !== userId) {
    throw new Error("Not authorized");
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
  const row = db.select().from(importJobs).where(eq(importJobs.id, jobId)).get();

  if (!row) {
    throw new Error(`Import job ${jobId} not found`);
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(row.payload);
  } catch {
    throw new Error(`Import job ${jobId} has invalid JSON payload`);
  }
  const parsed = NormalizedImportSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new Error(`Import job ${jobId} has malformed payload: ${parsed.error.message}`);
  }
  const data = parsed.data;
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    warnings: [],
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
      db.update(importJobs)
        .set({
          status: "success",
          finishedAt: new Date(),
          totalItems: 0,
          warnings: JSON.stringify(result.warnings),
        })
        .where(eq(importJobs.id, jobId))
        .run();
      return;
    }

    // Set status to running + totalItems atomically
    db.update(importJobs)
      .set({ status: "running", startedAt: new Date(), totalItems: total })
      .where(eq(importJobs.id, jobId))
      .run();

    log.info(`Starting ${data.source} import job ${jobId} for user ${row.userId}: ${total} items`);

    // Shared resolution cache for the entire import job
    const resolveCache = new Map<string, number | null>();

    const progressInterval = 4;
    for (let i = 0; i < items.length; i++) {
      // Check for cancellation periodically
      if (i % progressInterval === 0) {
        const currentStatus = db
          .select({ status: importJobs.status })
          .from(importJobs)
          .where(eq(importJobs.id, jobId))
          .get();
        if (currentStatus?.status === "cancelled") {
          db.update(importJobs)
            .set({
              finishedAt: new Date(),
              errors: JSON.stringify(result.errors),
              warnings: JSON.stringify(result.warnings),
              currentMessage: "Import cancelled",
            })
            .where(eq(importJobs.id, jobId))
            .run();
          log.info(`Import job ${jobId} cancelled by user`);
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
            await processEpisode(row.userId, data.episodes[item.index], result, resolveCache);
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

        db.update(importJobs)
          .set({
            processedItems: i + 1,
            importedCount: result.imported,
            skippedCount: result.skipped,
            failedCount: result.failed,
            currentMessage: label,
          })
          .where(eq(importJobs.id, jobId))
          .run();
      }
    }

    // Success
    db.update(importJobs)
      .set({
        status: "success",
        finishedAt: new Date(),
        processedItems: total,
        importedCount: result.imported,
        skippedCount: result.skipped,
        failedCount: result.failed,
        errors: JSON.stringify(result.errors),
        warnings: JSON.stringify(result.warnings),
        currentMessage: "Import complete",
      })
      .where(eq(importJobs.id, jobId))
      .run();

    log.info(
      `Import job ${jobId} complete: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`,
    );
  } catch (err) {
    // Fatal error
    result.errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
    db.update(importJobs)
      .set({
        status: "error",
        finishedAt: new Date(),
        errors: JSON.stringify(result.errors),
        warnings: JSON.stringify(result.warnings),
        currentMessage: "Import failed",
      })
      .where(eq(importJobs.id, jobId))
      .run();

    log.error(`Import job ${jobId} failed:`, err);
  }
}
