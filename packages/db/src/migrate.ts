import { rmSync } from "node:fs";
import path from "node:path";

import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { createLogger } from "@sofa/logger";

import { db } from "./client";

const log = createLogger("db");

// A function, not a constant: import.meta.dir is undefined when this module is loaded under Vitest/Node.
export const getMigrationsFolder = () => path.join(import.meta.dir, "../drizzle");

export function runMigrations(migrationsFolder = getMigrationsFolder()) {
  log.debug("Running database migrations...");
  migrate(db, { migrationsFolder });
  log.debug("Database migrations complete");
}

/**
 * Apply pending migrations to a SQLite file other than the live database (e.g. a backup
 * about to be restored). Throws — leaving the live database untouched — if any fails.
 */
export async function migrateDatabaseFile(
  filePath: string,
  migrationsFolder = getMigrationsFolder(),
): Promise<void> {
  // Imported lazily so this module stays loadable under Vitest/Node (no bun:sqlite there).
  const { Database } = await import("bun:sqlite");
  const { drizzle } = await import("drizzle-orm/bun-sqlite");
  const client = new Database(filePath);
  const fileDb = drizzle({ client });
  try {
    // The file is renamed into place afterwards: force a rollback journal so a backup
    // whose header says WAL can't leave -wal/-shm side files next to it.
    client.run("PRAGMA journal_mode = DELETE");
    client.run("PRAGMA foreign_keys = ON"); // same as the live connection (client.ts getClient)
    migrate(fileDb, { migrationsFolder });
  } finally {
    client.close();
    // Opening a WAL-header file can leave an empty -shm behind even after switching modes;
    // the connection is closed and the journal is DELETE-mode, so nothing in them matters.
    rmSync(`${filePath}-wal`, { force: true });
    rmSync(`${filePath}-shm`, { force: true });
  }
}
