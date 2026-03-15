import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { CACHE_DIR } from "@sofa/config";
import { db } from "@sofa/db/client";
import { inArray, isNull, notInArray } from "@sofa/db/helpers";
import { persons, titleCast, titles, userTitleStatus } from "@sofa/db/schema";
import { createLogger } from "@sofa/logger";

const log = createLogger("purge");

const BATCH_SIZE = 500;

/**
 * Delete un-enriched "shell" titles that aren't in any user's library,
 * then clean up orphaned person records.
 */
export function purgeMetadataCache(): {
  deletedTitles: number;
  deletedPersons: number;
} {
  return db.transaction(() => {
    // Find shell titles (never fully fetched) not in any user's library
    const shellTitles = db
      .select({ id: titles.id })
      .from(titles)
      .where(isNull(titles.lastFetchedAt))
      .all();

    if (shellTitles.length === 0) {
      log.info("No un-enriched titles to purge");
      return { deletedTitles: 0, deletedPersons: purgeOrphanedPersons() };
    }

    // Filter out titles that are in any user's library
    const libraryTitleIds = new Set(
      db
        .select({ titleId: userTitleStatus.titleId })
        .from(userTitleStatus)
        .all()
        .map((r) => r.titleId),
    );

    const toDelete = shellTitles
      .map((t) => t.id)
      .filter((id) => !libraryTitleIds.has(id));

    if (toDelete.length === 0) {
      log.info("All un-enriched titles are in user libraries, skipping");
      return { deletedTitles: 0, deletedPersons: purgeOrphanedPersons() };
    }

    // Delete in batches to respect SQLite variable limits
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      db.delete(titles).where(inArray(titles.id, batch)).run();
    }
    const deletedTitles = toDelete.length;

    log.info(`Purged ${deletedTitles} un-enriched titles`);

    const deletedPersons = purgeOrphanedPersons();

    return { deletedTitles, deletedPersons };
  });
}

/**
 * Delete person records that have no remaining titleCast references.
 */
function purgeOrphanedPersons(): number {
  const orphanedPersons = db
    .select({ id: persons.id })
    .from(persons)
    .where(
      notInArray(
        persons.id,
        db.selectDistinct({ personId: titleCast.personId }).from(titleCast),
      ),
    )
    .all();

  if (orphanedPersons.length === 0) return 0;

  const ids = orphanedPersons.map((p) => p.id);
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    db.delete(persons).where(inArray(persons.id, batch)).run();
  }
  const deletedPersons = ids.length;

  log.info(`Purged ${deletedPersons} orphaned persons`);
  return deletedPersons;
}

/** Image cache subdirectories to scan */
const IMAGE_CATEGORIES = [
  "posters",
  "backdrops",
  "stills",
  "logos",
  "profiles",
] as const;

/**
 * Delete all cached images from disk.
 * Returns the count of files deleted and total bytes freed.
 */
export async function purgeImageCache(): Promise<{
  deletedFiles: number;
  freedBytes: number;
}> {
  let deletedFiles = 0;
  let freedBytes = 0;

  for (const category of IMAGE_CATEGORIES) {
    const dir = path.join(CACHE_DIR, category);

    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      // Directory doesn't exist yet, skip
      continue;
    }

    for (const filename of entries) {
      // Skip hidden files and temp files
      if (filename.startsWith(".")) continue;

      const filePath = path.join(dir, filename);
      try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) continue;

        freedBytes += fileStat.size;
        await unlink(filePath);
        deletedFiles++;
      } catch (err) {
        log.warn(`Failed to delete ${filePath}:`, err);
      }
    }
  }

  log.info(
    `Purged image cache: ${deletedFiles} files, ${(freedBytes / (1024 * 1024)).toFixed(1)} MB freed`,
  );

  return { deletedFiles, freedBytes };
}
