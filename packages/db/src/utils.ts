import { sql } from "drizzle-orm";

import { db } from "./client";

export function vacuumInto(destPath: string): void {
  db.run(sql.raw(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`));
}
