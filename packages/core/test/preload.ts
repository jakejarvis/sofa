import { mock } from "bun:test";
import { applyMigrations, testDb } from "./sqlite";

mock.module("@sofa/db/client", () => ({
  db: testDb,
  closeDatabase: () => {},
}));

applyMigrations();
