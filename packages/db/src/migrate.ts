import path from "node:path";

import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { createLogger } from "@sofa/logger";

import { db } from "./client";

const log = createLogger("db");

export function runMigrations(migrationsFolder = path.join(import.meta.dir, "../drizzle")) {
  log.debug("Running database migrations...");
  migrate(db, { migrationsFolder });
  log.debug("Database migrations complete");
}
