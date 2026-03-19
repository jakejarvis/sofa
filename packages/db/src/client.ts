import { Database } from "bun:sqlite";

import type { Logger } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { DATABASE_URL } from "@sofa/config";
import { createLogger } from "@sofa/logger";

import * as schema from "./schema";

const log = createLogger("drizzle");

const drizzleLogger: Logger = {
  logQuery(query: string, params: unknown[]) {
    log.debug(query, params.length ? params : "");
  },
};

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
};

function getClient() {
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
    return Reflect.get(getDb(), prop);
  },
});

/** Run PRAGMA optimize to refresh query planner statistics. */
export function optimizeDatabase() {
  getClient().run("PRAGMA optimize");
}

export function vacuumDatabase(into: string): void {
  getClient().run("VACUUM INTO ?", [into.replace(/'/g, "''")]);
}

/** Close the current connection, and clear singletons so the Proxy re-initializes on next access. */
export function closeDatabase() {
  globalForDb._client?.close();
  globalForDb._client = undefined;
  globalForDb._db = undefined;
}
