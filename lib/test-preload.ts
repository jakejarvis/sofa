import { mock } from "bun:test";
import { applyMigrations, testDb } from "@/lib/test-utils";

mock.module("@/lib/db/client", () => ({
  db: testDb,
  closeDatabase: () => {},
}));

applyMigrations();
