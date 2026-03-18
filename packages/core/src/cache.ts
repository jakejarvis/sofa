import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { CACHE_DIR } from "@sofa/config";
import { purgeShellTitlesTransaction } from "@sofa/db/queries/cache";
import { createLogger } from "@sofa/logger";

const log = createLogger("purge");

/**
 * Delete un-enriched "shell" titles that aren't in any user's library,
 * then clean up orphaned person records.
 */
export function purgeMetadataCache(): {
  deletedTitles: number;
  deletedPersons: number;
} {
  const result = purgeShellTitlesTransaction();

  if (result.deletedTitles > 0) {
    log.info(`Purged ${result.deletedTitles} un-enriched titles`);
  } else {
    log.info("No un-enriched titles to purge");
  }

  if (result.deletedPersons > 0) {
    log.info(`Purged ${result.deletedPersons} orphaned persons`);
  }

  return result;
}

/** Image cache subdirectories to scan */
const IMAGE_CATEGORIES = ["posters", "backdrops", "stills", "logos", "profiles"] as const;

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
