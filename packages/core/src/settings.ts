import { db } from "@sofa/db/client";
import { appSettings, user } from "@sofa/db/schema";
import { count, eq } from "drizzle-orm";

export function getSetting(key: string): string | null {
  const row = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

export function getUserCount(): number {
  const result = db.select({ count: count() }).from(user).get();
  return result?.count ?? 0;
}

export function isRegistrationOpen(): boolean {
  const userCount = getUserCount();
  if (userCount === 0) return true;

  const setting = getSetting("registrationOpen");
  return setting === "true";
}
