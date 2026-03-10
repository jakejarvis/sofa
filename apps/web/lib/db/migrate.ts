import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createLogger } from "@/lib/logger";
import { db } from "./client";

const log = createLogger("db");

export function runMigrations() {
  log.info("Running database migrations...");
  migrate(db, { migrationsFolder: "./drizzle" });
  log.info("Database migrations complete");
}
