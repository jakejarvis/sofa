import { eq, sql } from "drizzle-orm";

import { createLogger } from "@sofa/logger";

import { db } from "./client";
import platformData from "./platforms.json";
import { platformTmdbIds, platforms, titleAvailability, userPlatforms } from "./schema";

const log = createLogger("seed-platforms");

export interface SeedPlatform {
  tmdbProviderIds: number[];
  name: string;
  logoPath: string | null;
  urlTemplate: string;
  isSubscription: boolean;
}

export const SEED_DATA: SeedPlatform[] = platformData;

export function seedPlatforms(): void {
  log.debug(`Seeding ${SEED_DATA.length} platforms`);

  db.transaction(() => {
    const existingPlatforms = new Map(
      db
        .select()
        .from(platforms)
        .all()
        .map((p) => [p.id, p]),
    );
    const existingMappings = db.select().from(platformTmdbIds).all();
    const tmdbToPlatform = new Map(existingMappings.map((m) => [m.tmdbProviderId, m.platformId]));

    for (const seed of SEED_DATA) {
      // Find all existing platform IDs that any of this seed's TMDB IDs map to
      const existingPlatformIds = [
        ...new Set(
          seed.tmdbProviderIds
            .map((id) => tmdbToPlatform.get(id))
            .filter((id): id is string => id != null),
        ),
      ];

      let canonicalId: string;

      if (existingPlatformIds.length === 0) {
        // Brand new platform
        canonicalId = Bun.randomUUIDv7();
        db.insert(platforms)
          .values({
            id: canonicalId,
            name: seed.name,
            logoPath: seed.logoPath,
            urlTemplate: seed.urlTemplate,
            isSubscription: seed.isSubscription,
          })
          .run();
        log.debug(`Created platform "${seed.name}"`);
      } else {
        // Use the first existing platform as canonical
        canonicalId = existingPlatformIds[0]!;

        // Only update if metadata actually changed
        const existing = existingPlatforms.get(canonicalId);
        if (
          !existing ||
          existing.name !== seed.name ||
          existing.logoPath !== seed.logoPath ||
          existing.urlTemplate !== seed.urlTemplate ||
          existing.isSubscription !== seed.isSubscription
        ) {
          db.update(platforms)
            .set({
              name: seed.name,
              logoPath: seed.logoPath,
              urlTemplate: seed.urlTemplate,
              isSubscription: seed.isSubscription,
            })
            .where(eq(platforms.id, canonicalId))
            .run();
          log.debug(`Updated platform "${seed.name}"`);
        }

        // Merge duplicates into the canonical platform
        for (const oldId of existingPlatformIds.slice(1)) {
          // Re-point titleAvailability rows, ignoring conflicts from duplicates
          db.run(
            sql`UPDATE OR IGNORE ${titleAvailability} SET "platformId" = ${canonicalId} WHERE "platformId" = ${oldId}`,
          );
          // Delete any titleAvailability rows that couldn't be moved due to unique constraint
          db.delete(titleAvailability).where(eq(titleAvailability.platformId, oldId)).run();

          // Re-point userPlatforms rows, ignoring conflicts
          db.run(
            sql`UPDATE OR IGNORE ${userPlatforms} SET "platformId" = ${canonicalId} WHERE "platformId" = ${oldId}`,
          );
          db.delete(userPlatforms).where(eq(userPlatforms.platformId, oldId)).run();

          // Remove old TMDB ID mappings (cascade won't fire since we delete platform next)
          db.delete(platformTmdbIds).where(eq(platformTmdbIds.platformId, oldId)).run();

          // Delete the duplicate platform
          db.delete(platforms).where(eq(platforms.id, oldId)).run();
          log.debug(`Merged duplicate platform ${oldId} into "${seed.name}" (${canonicalId})`);
        }
      }

      // Batch insert missing TMDB ID mappings
      const missingTmdbIds = seed.tmdbProviderIds.filter(
        (id) => tmdbToPlatform.get(id) !== canonicalId,
      );
      if (missingTmdbIds.length > 0) {
        db.insert(platformTmdbIds)
          .values(
            missingTmdbIds.map((tmdbProviderId) => ({ platformId: canonicalId, tmdbProviderId })),
          )
          .onConflictDoNothing()
          .run();
        log.debug(`Added ${missingTmdbIds.length} TMDB mapping(s) for "${seed.name}"`);
      }
    }
  });

  log.debug(`Seeded ${SEED_DATA.length} platforms`);
}
