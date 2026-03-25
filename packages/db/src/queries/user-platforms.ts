import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "../client";
import { platformTmdbIds, platforms, userPlatforms } from "../schema";

export function getUserPlatformIds(userId: string): string[] {
  return db
    .select({ platformId: userPlatforms.platformId })
    .from(userPlatforms)
    .where(eq(userPlatforms.userId, userId))
    .all()
    .map((r) => r.platformId);
}

export function getUserPlatforms(userId: string) {
  return db
    .select({
      id: platforms.id,
      name: platforms.name,
      logoPath: platforms.logoPath,
      urlTemplate: platforms.urlTemplate,
      isSubscription: platforms.isSubscription,
    })
    .from(userPlatforms)
    .innerJoin(platforms, eq(userPlatforms.platformId, platforms.id))
    .where(eq(userPlatforms.userId, userId))
    .orderBy(desc(platforms.isSubscription), asc(platforms.name))
    .all();
}

export function setUserPlatforms(userId: string, platformIds: string[]): void {
  db.transaction((tx) => {
    tx.delete(userPlatforms).where(eq(userPlatforms.userId, userId)).run();
    if (platformIds.length > 0) {
      tx.insert(userPlatforms)
        .values(platformIds.map((platformId) => ({ userId, platformId })))
        .onConflictDoNothing()
        .run();
    }
  });
}

export function getAllPlatforms() {
  return db
    .select()
    .from(platforms)
    .orderBy(desc(platforms.isSubscription), asc(platforms.name))
    .all();
}

export function hasUserPlatforms(userId: string): boolean {
  return (
    db
      .select({ platformId: userPlatforms.platformId })
      .from(userPlatforms)
      .where(eq(userPlatforms.userId, userId))
      .limit(1)
      .get() != null
  );
}

export function platformIdsExist(platformIds: string[]): boolean {
  if (platformIds.length === 0) return true;
  const unique = [...new Set(platformIds)];
  const found = db
    .select({ id: platforms.id })
    .from(platforms)
    .where(inArray(platforms.id, unique))
    .all();
  return found.length === unique.length;
}

export function getTmdbProviderIdsForPlatform(platformId: string): number[] {
  return db
    .select({ tmdbProviderId: platformTmdbIds.tmdbProviderId })
    .from(platformTmdbIds)
    .where(eq(platformTmdbIds.platformId, platformId))
    .all()
    .map((r) => r.tmdbProviderId);
}

export function getTmdbProviderIdsByPlatformIds(platformIds: string[]): Map<string, number[]> {
  if (platformIds.length === 0) return new Map();
  const rows = db
    .select({
      platformId: platformTmdbIds.platformId,
      tmdbProviderId: platformTmdbIds.tmdbProviderId,
    })
    .from(platformTmdbIds)
    .where(inArray(platformTmdbIds.platformId, platformIds))
    .all();

  const map = new Map<string, number[]>();
  for (const row of rows) {
    const arr = map.get(row.platformId) ?? [];
    arr.push(row.tmdbProviderId);
    map.set(row.platformId, arr);
  }
  return map;
}
