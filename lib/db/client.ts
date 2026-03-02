import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof drizzle> | undefined;
  _client: ReturnType<typeof createClient> | undefined;
};

if (!globalForDb._client) {
  globalForDb._client = createClient({
    url: process.env.DATABASE_URL ?? "file:./data/sqlite.db",
  });
  globalForDb._client.execute("PRAGMA journal_mode = WAL");
  globalForDb._client.execute("PRAGMA foreign_keys = ON");
  globalForDb._client.execute("PRAGMA busy_timeout = 5000");
}

if (!globalForDb._db) {
  globalForDb._db = drizzle({ client: globalForDb._client, schema });
}

export const db = globalForDb._db;
export const client = globalForDb._client;
