import { eq, inArray } from "drizzle-orm";

import { db } from "../client";
import { personFilmography, persons, titles } from "../schema";

// ─── Single-row lookups ──────────────────────────────────────────────

export function getPersonById(personId: string) {
  return db.select().from(persons).where(eq(persons.id, personId)).get();
}

export function getPersonByTmdbId(tmdbId: number) {
  return db.select().from(persons).where(eq(persons.tmdbId, tmdbId)).get();
}

// ─── Mutations ───────────────────────────────────────────────────────

export function updatePerson(personId: string, values: Partial<typeof persons.$inferInsert>) {
  db.update(persons).set(values).where(eq(persons.id, personId)).run();
}

export function insertPersonReturning(values: typeof persons.$inferInsert) {
  return db.insert(persons).values(values).onConflictDoNothing().returning().get();
}

// ─── Filmography (joined read) ───────────────────────────────────────

export function getPersonFilmographyJoined(personId: string) {
  return db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      type: titles.type,
      title: titles.title,
      posterPath: titles.posterPath,
      posterThumbHash: titles.posterThumbHash,
      releaseDate: titles.releaseDate,
      firstAirDate: titles.firstAirDate,
      voteAverage: titles.voteAverage,
      character: personFilmography.character,
      department: personFilmography.department,
      job: personFilmography.job,
    })
    .from(personFilmography)
    .innerJoin(titles, eq(personFilmography.titleId, titles.id))
    .where(eq(personFilmography.personId, personId))
    .orderBy(personFilmography.displayOrder)
    .all();
}

// ─── Batch shell-title insert (transaction) ──────────────────────────

interface ShellTitleEntry {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview?: string | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  popularity?: number | null;
  voteAverage?: number | null;
  voteCount?: number | null;
}

/**
 * Insert shell title rows inside a transaction, returning a map of tmdbId to
 * internal UUID for every entry that was inserted (or already existed via
 * conflict fallback).
 */
export function batchInsertShellTitlesTransaction(
  entries: ShellTitleEntry[],
  existingTitleIdMap: Map<number, string>,
): Map<number, string> {
  const titleIdMap = new Map(existingTitleIdMap);

  const insertedTmdbIds = new Set<number>();
  db.transaction((tx) => {
    for (const entry of entries) {
      if (insertedTmdbIds.has(entry.tmdbId)) continue;
      insertedTmdbIds.add(entry.tmdbId);
      const row = tx
        .insert(titles)
        .values({
          tmdbId: entry.tmdbId,
          type: entry.mediaType,
          title: entry.title,
          overview: entry.overview,
          releaseDate: entry.releaseDate,
          firstAirDate: entry.firstAirDate,
          posterPath: entry.posterPath,
          backdropPath: entry.backdropPath,
          popularity: entry.popularity,
          voteAverage: entry.voteAverage,
          voteCount: entry.voteCount,
          lastFetchedAt: null,
        })
        .onConflictDoNothing()
        .returning()
        .get();
      if (row) titleIdMap.set(entry.tmdbId, row.id);
    }
  });

  // Resolve any rows that hit onConflictDoNothing (already existed but weren't
  // in the initial map)
  const stillMissing = [...insertedTmdbIds].filter((tmdbId) => !titleIdMap.has(tmdbId));
  if (stillMissing.length > 0) {
    const fallbacks = db
      .select({ id: titles.id, tmdbId: titles.tmdbId })
      .from(titles)
      .where(inArray(titles.tmdbId, stillMissing))
      .all();
    for (const fallback of fallbacks) {
      titleIdMap.set(fallback.tmdbId, fallback.id);
    }
  }

  return titleIdMap;
}

// ─── Replace filmography (transaction) ───────────────────────────────

/**
 * Atomically delete all filmography rows for a person and re-insert the new
 * set, then stamp `filmographyLastFetchedAt`.
 */
export function replaceFilmographyTransaction(
  personId: string,
  rows: (typeof personFilmography.$inferInsert)[],
  fetchedAt: Date,
): void {
  db.transaction((tx) => {
    tx.delete(personFilmography).where(eq(personFilmography.personId, personId)).run();

    for (const row of rows) {
      tx.insert(personFilmography).values(row).run();
    }

    tx.update(persons)
      .set({ filmographyLastFetchedAt: fetchedAt })
      .where(eq(persons.id, personId))
      .run();
  });
}

// ─── Browse batch upsert (transaction) ───────────────────────────────

interface BrowsePersonInput {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  knownForDepartment?: string | null;
  popularity?: number | null;
}

/**
 * Ensure every person in the batch has a local row. Inserts shell persons
 * (`lastFetchedAt = null`) for new tmdbIds.
 * Returns a map of tmdbId to internal UUID.
 */
export function ensureBrowsePersonsTransaction(items: BrowsePersonInput[]): Map<number, string> {
  if (items.length === 0) return new Map();

  const unique = new Map<number, BrowsePersonInput>();
  for (const item of items) {
    if (!unique.has(item.tmdbId)) unique.set(item.tmdbId, item);
  }

  const tmdbIds = [...unique.keys()];

  const existing = db
    .select({ id: persons.id, tmdbId: persons.tmdbId })
    .from(persons)
    .where(inArray(persons.tmdbId, tmdbIds))
    .all();

  const result = new Map<number, string>();
  for (const row of existing) {
    result.set(row.tmdbId, row.id);
  }

  const missing = tmdbIds.filter((id) => !result.has(id));
  if (missing.length === 0) return result;

  db.transaction((tx) => {
    for (const tmdbId of missing) {
      const item = unique.get(tmdbId);
      if (!item) continue;
      const row = tx
        .insert(persons)
        .values({
          tmdbId: item.tmdbId,
          name: item.name,
          profilePath: item.profilePath,
          knownForDepartment: item.knownForDepartment ?? null,
          popularity: item.popularity ?? null,
          lastFetchedAt: null,
        })
        .onConflictDoNothing()
        .returning({ id: persons.id })
        .get();
      if (row) {
        result.set(tmdbId, row.id);
      }
    }

    const stillMissing = missing.filter((id) => !result.has(id));
    if (stillMissing.length > 0) {
      const fallbacks = tx
        .select({ id: persons.id, tmdbId: persons.tmdbId })
        .from(persons)
        .where(inArray(persons.tmdbId, stillMissing))
        .all();
      for (const f of fallbacks) {
        result.set(f.tmdbId, f.id);
      }
    }
  });

  return result;
}
