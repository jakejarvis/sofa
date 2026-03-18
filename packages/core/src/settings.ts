import { db } from "@sofa/db/client";
import { count, eq } from "@sofa/db/helpers";
import { appSettings, user } from "@sofa/db/schema";

export function getSetting(key: string): string | null {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
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

export function getInstanceId(): string {
  const existing = getSetting("instanceId");
  if (existing) return existing;
  const id = Bun.randomUUIDv7();
  setSetting("instanceId", id);
  return id;
}

export function isRegistrationOpen(): boolean {
  const userCount = getUserCount();
  if (userCount === 0) return true;

  const setting = getSetting("registrationOpen");
  return setting === "true";
}
