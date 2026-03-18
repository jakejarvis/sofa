import { count, eq } from "drizzle-orm";

import { db } from "../client";
import { appSettings, user } from "../schema";

export function getSettingValue(key: string): string | null {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  return row?.value ?? null;
}

export function upsertSetting(key: string, value: string): void {
  db.insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

export function getUserCount(): number {
  const result = db.select({ count: count() }).from(user).get();
  return result?.count ?? 0;
}
