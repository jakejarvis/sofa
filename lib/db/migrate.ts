import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./client";

export async function runMigrations() {
  console.log("[migrate] Running database migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Database migrations complete");
}
