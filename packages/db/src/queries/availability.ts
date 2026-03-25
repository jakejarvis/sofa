import { and, eq } from "drizzle-orm";

import { db } from "../client";
import { platformTmdbIds, platforms, titleAvailability } from "../schema";

export function replaceAvailabilityTransaction(
  titleId: string,
  region: string,
  offers: (typeof titleAvailability.$inferInsert)[],
): void {
  db.transaction((tx) => {
    tx.delete(titleAvailability)
      .where(and(eq(titleAvailability.titleId, titleId), eq(titleAvailability.region, region)))
      .run();

    if (offers.length > 0) {
      tx.insert(titleAvailability).values(offers).onConflictDoNothing().run();
    }
  });
}

export function getAvailabilityForTitle(titleId: string) {
  return db
    .select({
      platformId: platforms.id,
      providerName: platforms.name,
      logoPath: platforms.logoPath,
      urlTemplate: platforms.urlTemplate,
      offerType: titleAvailability.offerType,
    })
    .from(titleAvailability)
    .innerJoin(platforms, eq(titleAvailability.platformId, platforms.id))
    .where(eq(titleAvailability.titleId, titleId))
    .all();
}

/**
 * Ensure a platform row exists for a TMDB provider.
 * Looks up via the platformTmdbIds junction table.
 * Uses a transaction to prevent orphaned platform rows under concurrent refreshes.
 * Returns the platform ID.
 */
export function ensurePlatformForTmdbProvider(
  tmdbProviderId: number,
  name: string,
  logoPath: string | null,
): string {
  return db.transaction((tx) => {
    const existing = tx
      .select({ platformId: platformTmdbIds.platformId })
      .from(platformTmdbIds)
      .where(eq(platformTmdbIds.tmdbProviderId, tmdbProviderId))
      .get();

    if (existing) {
      tx.update(platforms).set({ logoPath }).where(eq(platforms.id, existing.platformId)).run();
      return existing.platformId;
    }

    const id = Bun.randomUUIDv7();
    tx.insert(platforms).values({ id, name, logoPath }).run();
    tx.insert(platformTmdbIds)
      .values({ platformId: id, tmdbProviderId })
      .onConflictDoNothing()
      .run();

    // Verify our insert won (handles race with another writer)
    const mapping = tx
      .select({ platformId: platformTmdbIds.platformId })
      .from(platformTmdbIds)
      .where(eq(platformTmdbIds.tmdbProviderId, tmdbProviderId))
      .get()!;

    if (mapping.platformId !== id) {
      // Another transaction beat us — clean up our orphan
      tx.delete(platforms).where(eq(platforms.id, id)).run();
      tx.update(platforms).set({ logoPath }).where(eq(platforms.id, mapping.platformId)).run();
    }

    return mapping.platformId;
  });
}
