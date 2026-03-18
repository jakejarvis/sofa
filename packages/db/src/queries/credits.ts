import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../client";
import { persons, titleCast } from "../schema";

interface PersonData {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  popularity?: number;
}

export function getExistingPersonsByTmdbIds(tmdbIds: number[]) {
  if (tmdbIds.length === 0) return [];
  return db
    .select({
      id: persons.id,
      tmdbId: persons.tmdbId,
      name: persons.name,
      profilePath: persons.profilePath,
      profileThumbHash: persons.profileThumbHash,
      popularity: persons.popularity,
    })
    .from(persons)
    .where(inArray(persons.tmdbId, tmdbIds))
    .all();
}

export function batchUpsertPersonsTransaction(
  uniquePeople: PersonData[],
  existingMap: Map<number, ReturnType<typeof getExistingPersonsByTmdbIds>[number]>,
): Map<number, string> {
  const idMap = new Map<number, string>();
  for (const [tmdbId, p] of existingMap) {
    idMap.set(tmdbId, p.id);
  }

  db.transaction((tx) => {
    for (const p of uniquePeople) {
      const existingPerson = existingMap.get(p.tmdbId);
      if (existingPerson) {
        const nextPopularity = p.popularity ?? null;
        const pathChanged = existingPerson.profilePath !== p.profilePath;
        const needsUpdate =
          existingPerson.name !== p.name ||
          pathChanged ||
          existingPerson.popularity !== nextPopularity;
        if (!needsUpdate) continue;

        tx.update(persons)
          .set({
            name: p.name,
            profilePath: p.profilePath,
            popularity: nextPopularity,
            profileThumbHash: pathChanged ? null : existingPerson.profileThumbHash,
          })
          .where(eq(persons.id, existingPerson.id))
          .run();
        continue;
      }

      const row = tx
        .insert(persons)
        .values({
          tmdbId: p.tmdbId,
          name: p.name,
          profilePath: p.profilePath,
          popularity: p.popularity ?? null,
        })
        .onConflictDoNothing()
        .returning()
        .get();
      if (row) idMap.set(p.tmdbId, row.id);
    }
  });

  return idMap;
}

export function getFallbackPersonsByTmdbIds(tmdbIds: number[]) {
  if (tmdbIds.length === 0) return [];
  return db
    .select({ id: persons.id, tmdbId: persons.tmdbId })
    .from(persons)
    .where(inArray(persons.tmdbId, tmdbIds))
    .all();
}

export function getPersonsForTitleCast(titleId: string) {
  return db
    .select({
      id: persons.id,
      profilePath: persons.profilePath,
      profileThumbHash: persons.profileThumbHash,
    })
    .from(titleCast)
    .innerJoin(persons, eq(titleCast.personId, persons.id))
    .where(eq(titleCast.titleId, titleId))
    .all();
}

export function batchUpsertTitleCast(rows: (typeof titleCast.$inferInsert)[]): void {
  if (rows.length === 0) return;
  db.insert(titleCast)
    .values(rows)
    .onConflictDoUpdate({
      target: [titleCast.titleId, titleCast.personId, titleCast.department, titleCast.character],
      set: {
        job: sql`excluded.job`,
        displayOrder: sql`excluded.displayOrder`,
        episodeCount: sql`excluded.episodeCount`,
        lastFetchedAt: sql`excluded.lastFetchedAt`,
      },
    })
    .run();
}

export function getCastForTitleJoined(titleId: string) {
  return db
    .select({
      id: titleCast.id,
      personId: titleCast.personId,
      name: persons.name,
      character: titleCast.character,
      department: titleCast.department,
      job: titleCast.job,
      displayOrder: titleCast.displayOrder,
      episodeCount: titleCast.episodeCount,
      profilePath: persons.profilePath,
      profileThumbHash: persons.profileThumbHash,
      tmdbId: persons.tmdbId,
    })
    .from(titleCast)
    .innerJoin(persons, eq(titleCast.personId, persons.id))
    .where(eq(titleCast.titleId, titleId))
    .orderBy(titleCast.displayOrder)
    .all();
}
