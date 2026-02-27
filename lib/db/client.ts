import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof drizzle> | undefined;
  _sqlite: Database.Database | undefined;
};

if (!globalForDb._sqlite) {
  globalForDb._sqlite = new Database(process.env.DATABASE_URL ?? "sqlite.db");
  globalForDb._sqlite.pragma("journal_mode = WAL");
  globalForDb._sqlite.pragma("foreign_keys = ON");
  globalForDb._sqlite.pragma("busy_timeout = 5000");
}

if (!globalForDb._db) {
  globalForDb._db = drizzle(globalForDb._sqlite, { schema });
}

export const db = globalForDb._db;
export const sqlite = globalForDb._sqlite;
