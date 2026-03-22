import { renameSync, unlinkSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import { BACKUP_DIR, DATABASE_URL } from "@sofa/config";
import {
  closeDatabase,
  vacuumDatabase,
  validateBackupDatabase,
  withDatabaseAccessBlocked,
} from "@sofa/db/client";
import { runMigrations } from "@sofa/db/migrate";
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

  vacuumDatabase(dest);

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
    throw new ORPCError("BAD_REQUEST", {
      message: "Invalid backup filename",
      data: { code: AppErrorCode.BACKUP_DELETE_FAILED },
    });
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!(await Bun.file(filePath).exists())) {
    throw new ORPCError("NOT_FOUND", {
      message: "Backup not found",
      data: { code: AppErrorCode.BACKUP_NOT_FOUND },
    });
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

      await withDatabaseAccessBlocked(async () => {
        // Keep the close+replace window synchronous to avoid event-loop interleaving.
        log.info("Replacing database...");
        closeDatabase();
        renameSync(tempPath, DATABASE_URL);
        unlinkIfExistsSync(`${DATABASE_URL}-wal`);
        unlinkIfExistsSync(`${DATABASE_URL}-shm`);

        // Ensure restored backups from older app versions are brought up-to-date.
        runMigrations();
      });
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
