import { and, eq, sql } from "drizzle-orm";

import { db } from "../client";
import { platforms, titleAvailability } from "../schema";

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
      tmdbProviderId: platforms.tmdbProviderId,
      offerType: titleAvailability.offerType,
    })
    .from(titleAvailability)
    .innerJoin(platforms, eq(titleAvailability.platformId, platforms.id))
    .where(eq(titleAvailability.titleId, titleId))
    .all();
}

/**
 * Ensure a platform row exists for a TMDB provider. Upserts by tmdbProviderId.
 * Returns the platform ID.
 */
export function ensurePlatformForTmdbProvider(
  tmdbProviderId: number,
  name: string,
  logoPath: string | null,
): string {
  const row = db
    .insert(platforms)
    .values({
      tmdbProviderId,
      name,
      logoPath,
      displayOrder: 999,
    })
    .onConflictDoUpdate({
      target: platforms.tmdbProviderId,
      set: {
        name: sql`excluded.name`,
        logoPath: sql`excluded.logoPath`,
      },
    })
    .returning({ id: platforms.id })
    .get();

  return row!.id;
}
