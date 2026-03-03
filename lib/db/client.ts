import { Database } from "bun:sqlite";
import path from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

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

const DATABASE_URL =
  process.env.DATABASE_URL ||
  path.join(process.env.DATA_DIR || "./data", "sqlite.db");

function getClient() {
  if (!globalForDb._client) {
    globalForDb._client = new Database(DATABASE_URL);
    globalForDb._client.run("PRAGMA journal_mode = WAL");
    globalForDb._client.run("PRAGMA foreign_keys = ON");
    globalForDb._client.run("PRAGMA busy_timeout = 5000");
  }
  return globalForDb._client;
}

function getDb() {
  if (!globalForDb._db) {
    globalForDb._db = drizzle({ client: getClient(), schema });
  }
  return globalForDb._db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export function closeDatabase() {
  globalForDb._client?.close();
}
