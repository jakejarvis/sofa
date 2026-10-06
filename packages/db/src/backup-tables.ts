/**
 * Tables a file must contain to be accepted as a Sofa backup.
 *
 * Only tables that have existed in every release since v0.1.0 belong here.
 * Restore runs migrations after swapping the file in, which creates any newer
 * tables — so requiring the *current* schema would reject every backup taken
 * before the most recent table was added. `__drizzle_migrations` proves the file
 * is a migrated Sofa database and is what lets those migrations run.
 *
 * Never add a newly created table to this list.
 */
export const REQUIRED_BACKUP_TABLES: readonly string[] = [
  "__drizzle_migrations",
  "account",
  "appSettings",
  "cronRuns",
  "episodes",
  "genres",
  "importJobs",
  "integrationEvents",
  "integrations",
  "personFilmography",
  "persons",
  "seasons",
  "session",
  "titleCast",
  "titleGenres",
  "titleRecommendations",
  "titles",
  "user",
  "userEpisodeWatches",
  "userMovieWatches",
  "userRatings",
  "userTitleStatus",
  "verification",
];

/** Return the required backup tables that are absent from `tableNames`. */
export function findMissingBackupTables(tableNames: Iterable<string>): string[] {
  const present = new Set(tableNames);
  return REQUIRED_BACKUP_TABLES.filter((table) => !present.has(table));
}

/**
 * True when the backup has applied a migration newer than any this build ships —
 * i.e. it was taken on a newer Sofa version and would run under code that doesn't know its schema.
 */
export function isFromNewerVersion(
  appliedCreatedAt: Iterable<number | string>,
  localFolderMillis: Iterable<number>,
): boolean {
  const newestLocal = Math.max(0, ...localFolderMillis);
  for (const createdAt of appliedCreatedAt) {
    if (Number(createdAt) > newestLocal) return true;
  }
  return false;
}
