import { inArray, isNull, notInArray } from "drizzle-orm";

import { db } from "../client";
import { persons, titleCast, titles, userTitleStatus } from "../schema";

const BATCH_SIZE = 500;

export function purgeShellTitlesTransaction(): { deletedTitles: number; deletedPersons: number } {
  return db.transaction(() => {
    const shellTitles = db
      .select({ id: titles.id })
      .from(titles)
      .where(isNull(titles.lastFetchedAt))
      .all();

    if (shellTitles.length === 0) {
      return { deletedTitles: 0, deletedPersons: purgeOrphanedPersons() };
    }

    const libraryTitleIds = new Set(
      db
        .select({ titleId: userTitleStatus.titleId })
        .from(userTitleStatus)
        .all()
        .map((r) => r.titleId),
    );

    const toDelete = shellTitles.map((t) => t.id).filter((id) => !libraryTitleIds.has(id));

    if (toDelete.length === 0) {
      return { deletedTitles: 0, deletedPersons: purgeOrphanedPersons() };
    }

    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      db.delete(titles).where(inArray(titles.id, batch)).run();
    }

    return { deletedTitles: toDelete.length, deletedPersons: purgeOrphanedPersons() };
  });
}

export function purgeOrphanedPersons(): number {
  const orphanedPersons = db
    .select({ id: persons.id })
    .from(persons)
    .where(
      notInArray(persons.id, db.selectDistinct({ personId: titleCast.personId }).from(titleCast)),
    )
    .all();

  if (orphanedPersons.length === 0) return 0;

  const ids = orphanedPersons.map((p) => p.id);
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    db.delete(persons).where(inArray(persons.id, batch)).run();
  }

  return ids.length;
}
