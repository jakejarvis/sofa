import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./client";

export function runMigrations() {
  console.log("[migrate] Running database migrations...");
  migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Database migrations complete");
}
