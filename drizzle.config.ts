import { defineConfig } from "drizzle-kit";

const DATA_DIR = process.env.DATA_DIR || "./data";
const DATABASE_URL = process.env.DATABASE_URL || `file:${DATA_DIR}/sqlite.db`;

export default defineConfig({
  dialect: "turso",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
