import { inArray, isNull, notInArray } from "drizzle-orm";

import { db } from "../client";
import { episodes, persons, seasons, titleCast, titles, userTitleStatus } from "../schema";

const BATCH_SIZE = 500;

export interface OrphanedImage {
  category: "posters" | "backdrops" | "stills" | "profiles";
  path: string;
}

export interface PurgeResult {
  deletedTitles: number;
  deletedPersons: number;
  orphanedImages: OrphanedImage[];
}

/** Collect all cached image paths associated with a set of title IDs. */
function collectTitleImagePaths(titleIds: string[]): OrphanedImage[] {
  const images: OrphanedImage[] = [];

  for (let i = 0; i < titleIds.length; i += BATCH_SIZE) {
    const batch = titleIds.slice(i, i + BATCH_SIZE);

    // Title posters + backdrops
    const titleRows = db
      .select({ posterPath: titles.posterPath, backdropPath: titles.backdropPath })
      .from(titles)
      .where(inArray(titles.id, batch))
      .all();
    for (const r of titleRows) {
      if (r.posterPath) images.push({ category: "posters", path: r.posterPath });
      if (r.backdropPath) images.push({ category: "backdrops", path: r.backdropPath });
    }

    // Season posters
    const seasonRows = db
      .select({ posterPath: seasons.posterPath })
      .from(seasons)
      .where(inArray(seasons.titleId, batch))
      .all();
    for (const r of seasonRows) {
      if (r.posterPath) images.push({ category: "posters", path: r.posterPath });
    }

    // Episode stills (via seasons)
    const seasonIds = db
      .select({ id: seasons.id })
      .from(seasons)
      .where(inArray(seasons.titleId, batch))
      .all()
      .map((s) => s.id);

    for (let j = 0; j < seasonIds.length; j += BATCH_SIZE) {
      const sBatch = seasonIds.slice(j, j + BATCH_SIZE);
      const epRows = db
        .select({ stillPath: episodes.stillPath })
        .from(episodes)
        .where(inArray(episodes.seasonId, sBatch))
        .all();
      for (const r of epRows) {
        if (r.stillPath) images.push({ category: "stills", path: r.stillPath });
      }
    }
  }

  return images;
}

/** Collect profile paths for persons that will be orphaned (no remaining titleCast). */
function collectOrphanedPersonImages(): OrphanedImage[] {
  const orphaned = db
    .select({ profilePath: persons.profilePath })
    .from(persons)
    .where(
      notInArray(persons.id, db.selectDistinct({ personId: titleCast.personId }).from(titleCast)),
    )
    .all();

  return orphaned
    .filter((p): p is { profilePath: string } => p.profilePath != null)
    .map((p) => ({ category: "profiles" as const, path: p.profilePath }));
}

export function purgeShellTitlesTransaction(): PurgeResult {
  return db.transaction(() => {
    const shellTitles = db
      .select({ id: titles.id })
      .from(titles)
      .where(isNull(titles.lastFetchedAt))
      .all();

    if (shellTitles.length === 0) {
      const orphanedImages = collectOrphanedPersonImages();
      return { deletedTitles: 0, deletedPersons: purgeOrphanedPersons(), orphanedImages };
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
      const orphanedImages = collectOrphanedPersonImages();
      return { deletedTitles: 0, deletedPersons: purgeOrphanedPersons(), orphanedImages };
    }

    // Collect image paths BEFORE cascade-deleting the title rows
    const orphanedImages = collectTitleImagePaths(toDelete);

    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      db.delete(titles).where(inArray(titles.id, batch)).run();
    }

    // After title cascade deletes, collect orphaned person images then delete persons
    orphanedImages.push(...collectOrphanedPersonImages());
    return {
      deletedTitles: toDelete.length,
      deletedPersons: purgeOrphanedPersons(),
      orphanedImages,
    };
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
