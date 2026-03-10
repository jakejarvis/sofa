import path from "node:path";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./client";
import { createLogger } from "./logger";

const log = createLogger("db");

export function runMigrations(
  migrationsFolder = path.join(import.meta.dir, "../drizzle"),
) {
  log.info("Running database migrations...");
  migrate(db, { migrationsFolder });
  log.info("Database migrations complete");
}
