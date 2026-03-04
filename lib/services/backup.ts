import { Database } from "bun:sqlite";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { format } from "date-fns";
import { sql } from "drizzle-orm";
import { closeDatabase, db } from "@/lib/db/client";
import { createLogger } from "@/lib/logger";

const log = createLogger("backup");

const DATA_DIR = process.env.DATA_DIR || "./data";
const DATABASE_URL =
  process.env.DATABASE_URL || path.join(DATA_DIR, "sqlite.db");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

const BACKUP_PATTERN = /^sofa-backup-\d{4}-\d{2}-\d{2}-\d{6}\.db$/;
const PRE_RESTORE_PATTERN = /^pre-restore-\d{4}-\d{2}-\d{2}-\d{6}\.db$/;

export interface BackupInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

export function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function isValidBackupFilename(filename: string): boolean {
  const base = path.basename(filename);
  return (
    base === filename &&
    !filename.includes("..") &&
    (BACKUP_PATTERN.test(filename) || PRE_RESTORE_PATTERN.test(filename))
  );
}

export function createBackup(prefix = "sofa-backup"): BackupInfo {
  ensureBackupDir();

  const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
  const filename = `${prefix}-${timestamp}.db`;
  const dest = path.join(BACKUP_DIR, filename);

  // VACUUM INTO atomically creates a clean, self-contained copy (safe for WAL mode)
  db.run(sql.raw(`VACUUM INTO '${dest.replace(/'/g, "''")}'`));

  const stat = statSync(dest);
  log.info(`Created backup: ${filename} (${stat.size} bytes)`);

  return {
    filename,
    sizeBytes: stat.size,
    createdAt: stat.mtime.toISOString(),
  };
}

export function listBackups(): BackupInfo[] {
  ensureBackupDir();

  const files = readdirSync(BACKUP_DIR).filter(
    (f) => BACKUP_PATTERN.test(f) || PRE_RESTORE_PATTERN.test(f),
  );

  return files
    .map((filename) => {
      const stat = statSync(path.join(BACKUP_DIR, filename));
      return {
        filename,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function deleteBackup(filename: string): void {
  if (!isValidBackupFilename(filename)) {
    throw new Error("Invalid backup filename");
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!existsSync(filePath)) {
    throw new Error("Backup not found");
  }

  unlinkSync(filePath);
  log.info(`Deleted backup: ${filename}`);
}

export function getBackupPath(filename: string): string | null {
  if (!isValidBackupFilename(filename)) return null;

  const filePath = path.join(BACKUP_DIR, filename);
  return existsSync(filePath) ? filePath : null;
}

export async function readBackupFile(filename: string): Promise<Buffer | null> {
  const filePath = getBackupPath(filename);
  if (!filePath) return null;
  return readFile(filePath);
}

export function restoreFromBackup(buffer: Buffer): void {
  ensureBackupDir();

  const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
  const tempPath = path.join(BACKUP_DIR, `_restore-temp-${timestamp}.db`);

  try {
    // Write uploaded file to temp location
    writeFileSync(tempPath, buffer);

    // Validate it's a real SQLite database
    const testDb = new Database(tempPath, { readonly: true });
    try {
      const result = testDb.query("PRAGMA integrity_check").get() as {
        integrity_check: string;
      };
      if (result?.integrity_check !== "ok") {
        throw new Error("Database integrity check failed");
      }

      // Check for key app tables
      const tables = testDb
        .query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('user', 'titles', 'userTitleStatus')",
        )
        .all() as { name: string }[];
      if (tables.length < 2) {
        throw new Error("Invalid backup: missing expected application tables");
      }
    } finally {
      testDb.close();
    }

    // Create safety backup before replacing
    log.info("Creating pre-restore safety backup...");
    createBackup("pre-restore");

    // Replace the database
    log.info("Replacing database...");
    closeDatabase();
    copyFileSync(tempPath, DATABASE_URL);

    // Clean up WAL/SHM files from the old database
    const walPath = `${DATABASE_URL}-wal`;
    const shmPath = `${DATABASE_URL}-shm`;
    if (existsSync(walPath)) unlinkSync(walPath);
    if (existsSync(shmPath)) unlinkSync(shmPath);

    log.info("Database restored successfully");
  } finally {
    // Clean up temp file
    if (existsSync(tempPath)) unlinkSync(tempPath);
  }
}

export function pruneBackups(maxKeep: number): void {
  const backups = listBackups().filter((b) => BACKUP_PATTERN.test(b.filename));

  if (backups.length <= maxKeep) return;

  const toDelete = backups.slice(maxKeep);
  for (const backup of toDelete) {
    deleteBackup(backup.filename);
  }

  log.info(`Pruned ${toDelete.length} old backup(s), kept ${maxKeep}`);
}
