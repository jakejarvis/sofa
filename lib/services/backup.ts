import { Database } from "bun:sqlite";
import { mkdir, readdir, stat } from "node:fs/promises";
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

export async function ensureBackupDir() {
  await mkdir(BACKUP_DIR, { recursive: true });
}

function isValidBackupFilename(filename: string): boolean {
  const base = path.basename(filename);
  return (
    base === filename &&
    !filename.includes("..") &&
    (BACKUP_PATTERN.test(filename) || PRE_RESTORE_PATTERN.test(filename))
  );
}

export async function createBackup(
  prefix = "sofa-backup",
): Promise<BackupInfo> {
  await ensureBackupDir();

  const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
  const filename = `${prefix}-${timestamp}.db`;
  const dest = path.join(BACKUP_DIR, filename);

  // VACUUM INTO atomically creates a clean, self-contained copy (safe for WAL mode)
  db.run(sql.raw(`VACUUM INTO '${dest.replace(/'/g, "''")}'`));

  const s = await stat(dest);
  log.info(`Created backup: ${filename} (${s.size} bytes)`);

  return {
    filename,
    sizeBytes: s.size,
    createdAt: s.mtime.toISOString(),
  };
}

export async function listBackups(): Promise<BackupInfo[]> {
  await ensureBackupDir();

  const files = (await readdir(BACKUP_DIR)).filter(
    (f) => BACKUP_PATTERN.test(f) || PRE_RESTORE_PATTERN.test(f),
  );

  const results: BackupInfo[] = [];
  for (const filename of files) {
    const s = await stat(path.join(BACKUP_DIR, filename));
    results.push({
      filename,
      sizeBytes: s.size,
      createdAt: s.mtime.toISOString(),
    });
  }

  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function deleteBackup(filename: string): Promise<void> {
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

export async function restoreFromBackup(buffer: Buffer): Promise<void> {
  await ensureBackupDir();

  const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
  const tempPath = path.join(BACKUP_DIR, `_restore-temp-${timestamp}.db`);

  try {
    // Write uploaded file to temp location
    await Bun.write(tempPath, buffer);

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
    await createBackup("pre-restore");

    // Replace the database
    log.info("Replacing database...");
    closeDatabase();
    await Bun.write(DATABASE_URL, Bun.file(tempPath));

    // Clean up WAL/SHM files from the old database
    const walFile = Bun.file(`${DATABASE_URL}-wal`);
    const shmFile = Bun.file(`${DATABASE_URL}-shm`);
    if (await walFile.exists()) await walFile.delete();
    if (await shmFile.exists()) await shmFile.delete();

    log.info("Database restored successfully");
  } finally {
    // Clean up temp file
    const tempFile = Bun.file(tempPath);
    if (await tempFile.exists()) await tempFile.delete();
  }
}

export async function pruneBackups(maxKeep: number): Promise<void> {
  const backups = (await listBackups()).filter((b) =>
    BACKUP_PATTERN.test(b.filename),
  );

  if (backups.length <= maxKeep) return;

  const toDelete = backups.slice(maxKeep);
  for (const backup of toDelete) {
    await deleteBackup(backup.filename);
  }

  log.info(`Pruned ${toDelete.length} old backup(s), kept ${maxKeep}`);
}
