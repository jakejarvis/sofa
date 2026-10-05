import { sql } from "drizzle-orm";

import { db } from "../client";

/** Refresh SQLite query-planner statistics after a bulk write (e.g. an import). */
export function refreshPlannerStats(): void {
  db.run(sql`PRAGMA optimize=0x10002`);
}
