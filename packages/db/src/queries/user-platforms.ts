import { eq, inArray } from "drizzle-orm";

import { db } from "../client";
import { platforms, userPlatforms } from "../schema";

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
      tmdbProviderId: platforms.tmdbProviderId,
      logoPath: platforms.logoPath,
      urlTemplate: platforms.urlTemplate,
      displayOrder: platforms.displayOrder,
    })
    .from(userPlatforms)
    .innerJoin(platforms, eq(userPlatforms.platformId, platforms.id))
    .where(eq(userPlatforms.userId, userId))
    .orderBy(platforms.displayOrder)
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
  return db.select().from(platforms).orderBy(platforms.displayOrder).all();
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
  const found = db
    .select({ id: platforms.id })
    .from(platforms)
    .where(inArray(platforms.id, platformIds))
    .all();
  return found.length === platformIds.length;
}
