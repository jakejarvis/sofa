import { and, eq, inArray } from "drizzle-orm";

import { db } from "../client";
import {
  importJobs,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "../schema";

// ─── Existence checks (deduplication) ────────────────────────────────

export function hasMovieWatch(userId: string, titleId: string): boolean {
  const existing = db
    .select({ id: userMovieWatches.id })
    .from(userMovieWatches)
    .where(and(eq(userMovieWatches.userId, userId), eq(userMovieWatches.titleId, titleId)))
    .get();
  return !!existing;
}

export function hasEpisodeWatch(userId: string, episodeId: string): boolean {
  const existing = db
    .select({ id: userEpisodeWatches.id })
    .from(userEpisodeWatches)
    .where(and(eq(userEpisodeWatches.userId, userId), eq(userEpisodeWatches.episodeId, episodeId)))
    .get();
  return !!existing;
}

export function hasTitleStatus(userId: string, titleId: string): boolean {
  return !!getTitleStatusValue(userId, titleId);
}

export function getTitleStatusValue(
  userId: string,
  titleId: string,
): "watchlist" | "in_progress" | "completed" | null {
  const existing = db
    .select({ status: userTitleStatus.status })
    .from(userTitleStatus)
    .where(and(eq(userTitleStatus.userId, userId), eq(userTitleStatus.titleId, titleId)))
    .get();
  return (existing?.status as "watchlist" | "in_progress" | "completed") ?? null;
}

export function hasRating(userId: string, titleId: string): boolean {
  const existing = db
    .select({ ratingStars: userRatings.ratingStars })
    .from(userRatings)
    .where(and(eq(userRatings.userId, userId), eq(userRatings.titleId, titleId)))
    .get();
  return !!existing;
}

// ─── Import job CRUD ─────────────────────────────────────────────────

export function getImportJob(jobId: string) {
  return db.select().from(importJobs).where(eq(importJobs.id, jobId)).get();
}

export function updateImportJobProgress(
  jobId: string,
  values: Partial<typeof importJobs.$inferInsert>,
) {
  db.update(importJobs).set(values).where(eq(importJobs.id, jobId)).run();
}

export function getImportJobStatus(jobId: string) {
  return db
    .select({ status: importJobs.status })
    .from(importJobs)
    .where(eq(importJobs.id, jobId))
    .get();
}

export function insertImportJob(values: typeof importJobs.$inferInsert) {
  return db.insert(importJobs).values(values).returning().get();
}

export function getActiveImportJobForUser(userId: string) {
  return db
    .select()
    .from(importJobs)
    .where(and(eq(importJobs.userId, userId), inArray(importJobs.status, ["pending", "running"])))
    .get();
}
