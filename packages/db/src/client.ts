import { Database } from "bun:sqlite";
import { AsyncLocalStorage } from "node:async_hooks";
import { closeSync, openSync, readSync } from "node:fs";

import type { Logger } from "drizzle-orm";
import { getTableName } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { SQLiteTable } from "drizzle-orm/sqlite-core";

import { DATABASE_URL } from "@sofa/config";
import { createLogger } from "@sofa/logger";

import * as schema from "./schema";

const log = createLogger("drizzle");

const drizzleLogger: Logger = {
  logQuery(query: string, params: unknown[]) {
    log.debug(query, params.length ? params : "");
  },
};

export class DatabaseRestoreInProgressError extends Error {
  constructor(message = "Database is temporarily unavailable during restore") {
    super(message);
    this.name = "DatabaseRestoreInProgressError";
  }
}

// Lazy-init singleton via globalThis. Next.js evaluates module-level code at
// build time (when no database exists) and re-imports modules on HMR in dev
// (which would create duplicate connections). Stashing the instances on
// globalThis and wrapping `db` in a Proxy defers all real work to the first
// property access at runtime, sidestepping both problems.
//
// Only the Drizzle instance (`db`) is exported as a Proxy — the raw bun:sqlite
// Database is kept internal because its native C++ methods lose their `this`
// binding when accessed through Reflect.get, so a Proxy around it would break.
// Use `closeDatabase()` for graceful shutdown instead.

const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof drizzle> | undefined;
  _client: Database | undefined;
  _accessBlocked: boolean | undefined;
};

const dbAccessBypass = new AsyncLocalStorage<boolean>();

function assertDatabaseAccessible() {
  if (globalForDb._accessBlocked && !dbAccessBypass.getStore()) {
    throw new DatabaseRestoreInProgressError();
  }
}

function getClient() {
  assertDatabaseAccessible();
  if (!globalForDb._client) {
    globalForDb._client = new Database(DATABASE_URL);
    globalForDb._client.run("PRAGMA journal_mode = WAL");
    globalForDb._client.run("PRAGMA foreign_keys = ON");
    globalForDb._client.run("PRAGMA busy_timeout = 5000");
    globalForDb._client.run("PRAGMA synchronous = NORMAL");
    globalForDb._client.run("PRAGMA cache_size = -64000");
    globalForDb._client.run("PRAGMA temp_store = MEMORY");
    globalForDb._client.run("PRAGMA mmap_size = 268435456");
  }
  return globalForDb._client;
}

function getDb() {
  assertDatabaseAccessible();
  if (!globalForDb._db) {
    globalForDb._db = drizzle({
      client: getClient(),
      schema,
      logger: drizzleLogger,
    });
  }
  return globalForDb._db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    assertDatabaseAccessible();
    return Reflect.get(getDb(), prop);
  },
});

/** Run PRAGMA optimize to refresh query planner statistics. */
export function optimizeDatabase() {
  getClient().run("PRAGMA optimize");
}

export function vacuumDatabase(into: string): void {
  getClient().run("VACUUM INTO ?", [into]);
}

export function isDatabaseAccessBlocked(): boolean {
  return globalForDb._accessBlocked === true;
}

export async function withDatabaseAccessBlocked<T>(fn: () => Promise<T> | T): Promise<T> {
  globalForDb._accessBlocked = true;
  try {
    return await dbAccessBypass.run(true, fn);
  } finally {
    globalForDb._accessBlocked = false;
  }
}

/** Close the current connection, and clear singletons so the Proxy re-initializes on next access. */
export function closeDatabase() {
  globalForDb._client?.close();
  globalForDb._client = undefined;
  globalForDb._db = undefined;
}

// ─── Backup validation ──────────────────────────────────────────────

const SQLITE_MAGIC = "SQLite format 3\0";

const REQUIRED_TABLES = Object.values(schema)
  .filter((v) => v instanceof SQLiteTable)
  .map((t) => getTableName(t as SQLiteTable));

export function validateBackupDatabase(filePath: string): void {
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

  const validationDb = new Database(filePath, { readonly: true });
  try {
    const integrityRows = validationDb.query("PRAGMA integrity_check").all() as {
      integrity_check: string;
    }[];
    if (integrityRows.length === 0 || integrityRows.some((row) => row.integrity_check !== "ok")) {
      throw new Error("Database integrity check failed");
    }

    const foreignKeyErrors = validationDb.query("PRAGMA foreign_key_check").all();
    if (foreignKeyErrors.length > 0) {
      throw new Error("Database foreign key check failed");
    }

    const tableRows = validationDb
      .query("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableSet = new Set(tableRows.map((row) => row.name));
    const missing = REQUIRED_TABLES.filter((table) => !tableSet.has(table));
    if (missing.length > 0) {
      throw new Error(`Invalid backup: missing required tables (${missing.join(", ")})`);
    }
  } finally {
    validationDb.close();
  }
}
