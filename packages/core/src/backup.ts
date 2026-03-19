import { Database } from "bun:sqlite";
import { renameSync, unlinkSync, closeSync, openSync, readSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

import { BACKUP_DIR, DATABASE_URL } from "@sofa/config";
import { closeDatabase } from "@sofa/db/client";
import { runMigrations } from "@sofa/db/migrate";
import { vacuumInto } from "@sofa/db/utils";
import { createLogger } from "@sofa/logger";

function formatTimestamp(date: Date): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}${p(date.getMilliseconds(), 3)}`;
}

const log = createLogger("backup");

const MANUAL_PATTERN = /^sofa-manual-\d{4}-\d{2}-\d{2}-\d{6}(?:\d{3})?\.db$/;
const SCHEDULED_PATTERN = /^sofa-scheduled-\d{4}-\d{2}-\d{2}-\d{6}(?:\d{3})?\.db$/;
const PRE_RESTORE_PATTERN = /^pre-restore-\d{4}-\d{2}-\d{2}-\d{6}(?:\d{3})?\.db$/;

export type BackupSource = "manual" | "scheduled" | "pre-restore";
type BackupPrefix = "sofa-manual" | "sofa-scheduled" | "pre-restore";

export interface BackupInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  source: BackupSource;
}

const REQUIRED_TABLES = [
  "account",
  "appSettings",
  "availabilityOffers",
  "cronRuns",
  "episodes",
  "seasons",
  "session",
  "titleRecommendations",
  "titles",
  "user",
  "userEpisodeWatches",
  "userMovieWatches",
  "userRatings",
  "userTitleStatus",
  "verification",
  "integrations",
  "integrationEvents",
] as const;

let backupOpQueue: Promise<void> = Promise.resolve();

/** @internal */
export function getBackupSource(filename: string): BackupSource {
  if (SCHEDULED_PATTERN.test(filename)) return "scheduled";
  if (PRE_RESTORE_PATTERN.test(filename)) return "pre-restore";
  return "manual";
}

/** @internal */
export function isKnownBackup(filename: string): boolean {
  return (
    MANUAL_PATTERN.test(filename) ||
    SCHEDULED_PATTERN.test(filename) ||
    PRE_RESTORE_PATTERN.test(filename)
  );
}

export async function ensureBackupDir() {
  await mkdir(BACKUP_DIR, { recursive: true });
}

async function withBackupLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = backupOpQueue;
  let release: (() => void) | undefined;
  backupOpQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await fn();
  } finally {
    release?.();
  }
}

function unlinkIfExistsSync(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

const SQLITE_MAGIC = "SQLite format 3\0";

function validateBackupDatabase(filePath: string): void {
  // Check SQLite magic bytes before opening with Database() to avoid
  // passing arbitrary files to the SQLite parser.
  const header = Buffer.alloc(16);
  const fd = openSync(filePath, "r");
  try {
    readSync(fd, header, 0, 16, 0);
  } finally {
    closeSync(fd);
  }
  if (header.toString("ascii", 0, 16) !== SQLITE_MAGIC) {
    throw new Error("Not a valid SQLite database file");
  }

  const testDb = new Database(filePath, { readonly: true });
  try {
    const integrityRows = testDb.query("PRAGMA integrity_check").all() as {
      integrity_check: string;
    }[];
    if (integrityRows.length === 0 || integrityRows.some((row) => row.integrity_check !== "ok")) {
      throw new Error("Database integrity check failed");
    }

    const foreignKeyErrors = testDb.query("PRAGMA foreign_key_check").all();
    if (foreignKeyErrors.length > 0) {
      throw new Error("Database foreign key check failed");
    }

    const tableRows = testDb.query("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string;
    }[];
    const tableSet = new Set(tableRows.map((row) => row.name));
    const missing = REQUIRED_TABLES.filter((table) => !tableSet.has(table));
    if (missing.length > 0) {
      throw new Error(`Invalid backup: missing required tables (${missing.join(", ")})`);
    }
  } finally {
    testDb.close();
  }
}

/** @internal */
export function isValidBackupFilename(filename: string): boolean {
  const base = path.basename(filename);
  return base === filename && !filename.includes("..") && isKnownBackup(filename);
}

async function createBackupInternal(prefix: BackupPrefix): Promise<BackupInfo> {
  await ensureBackupDir();

  const timestamp = formatTimestamp(new Date());
  const filename = `${prefix}-${timestamp}.db`;
  const dest = path.join(BACKUP_DIR, filename);

  vacuumInto(dest);

  const s = await Bun.file(dest).stat();
  log.info(`Created backup: ${filename} (${s.size} bytes)`);

  return {
    filename,
    sizeBytes: s.size,
    createdAt: s.mtime.toISOString(),
    source: getBackupSource(filename),
  };
}

export async function createBackup(prefix: BackupPrefix = "sofa-manual"): Promise<BackupInfo> {
  return withBackupLock(async () => createBackupInternal(prefix));
}

export async function listBackups(): Promise<BackupInfo[]> {
  await ensureBackupDir();

  const files = (await readdir(BACKUP_DIR)).filter((f) => isKnownBackup(f));

  const results: BackupInfo[] = [];
  for (const filename of files) {
    const s = await Bun.file(path.join(BACKUP_DIR, filename)).stat();
    results.push({
      filename,
      sizeBytes: s.size,
      createdAt: s.mtime.toISOString(),
      source: getBackupSource(filename),
    });
  }

  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function deleteBackupInternal(filename: string): Promise<void> {
  if (!isValidBackupFilename(filename)) {
    throw new Error("Invalid backup filename");
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!(await Bun.file(filePath).exists())) {
    throw new Error("Backup not found");
  }

  await Bun.file(filePath).delete();
  log.info(`Deleted backup: ${filename}`);
}

export async function deleteBackup(filename: string): Promise<void> {
  await withBackupLock(async () => deleteBackupInternal(filename));
}

export async function getBackupPath(filename: string): Promise<string | null> {
  if (!isValidBackupFilename(filename)) return null;

  const filePath = path.join(BACKUP_DIR, filename);
  return (await Bun.file(filePath).exists()) ? filePath : null;
}

export async function readBackupFile(filename: string): Promise<Buffer | null> {
  const filePath = await getBackupPath(filename);
  if (!filePath) return null;
  return Buffer.from(await Bun.file(filePath).arrayBuffer());
}

export async function restoreFromBackup(source: Buffer | string): Promise<void> {
  await withBackupLock(async () => {
    await ensureBackupDir();

    const dbDir = path.dirname(DATABASE_URL);
    await mkdir(dbDir, { recursive: true });

    const timestamp = formatTimestamp(new Date());
    const tempPath = path.join(dbDir, `.restore-temp-${timestamp}-${crypto.randomUUID()}.db`);

    try {
      if (typeof source === "string") {
        renameSync(source, tempPath);
      } else {
        await Bun.write(tempPath, source);
      }
      validateBackupDatabase(tempPath);

      log.info("Creating pre-restore safety backup...");
      await createBackupInternal("pre-restore");

      // Keep the close+replace window synchronous to avoid event-loop interleaving.
      log.info("Replacing database...");
      closeDatabase();
      renameSync(tempPath, DATABASE_URL);
      unlinkIfExistsSync(`${DATABASE_URL}-wal`);
      unlinkIfExistsSync(`${DATABASE_URL}-shm`);

      // Ensure restored backups from older app versions are brought up-to-date.
      runMigrations();
      log.info("Database restored successfully");
    } finally {
      const tempFile = Bun.file(tempPath);
      if (await tempFile.exists()) await tempFile.delete();
    }
  });
}

export async function pruneBackups(maxKeep: number): Promise<void> {
  await withBackupLock(async () => {
    const backups = (await listBackups()).filter((b) => SCHEDULED_PATTERN.test(b.filename));

    if (maxKeep === 0 || backups.length <= maxKeep) return;

    const toDelete = backups.slice(maxKeep);
    for (const backup of toDelete) {
      await deleteBackupInternal(backup.filename);
    }

    log.info(`Pruned ${toDelete.length} old backup(s), kept ${maxKeep}`);
  });
}
