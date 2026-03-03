import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof drizzle> | undefined;
  _client: ReturnType<typeof createClient> | undefined;
};

function getClient() {
  if (!globalForDb._client) {
    globalForDb._client = createClient({
      url: process.env.DATABASE_URL ?? "file:./data/sqlite.db",
    });
    globalForDb._client.execute("PRAGMA journal_mode = WAL");
    globalForDb._client.execute("PRAGMA foreign_keys = ON");
    globalForDb._client.execute("PRAGMA busy_timeout = 5000");
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

export const client = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return Reflect.get(getClient(), prop);
  },
});
