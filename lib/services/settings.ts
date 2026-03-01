import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSettings, user } from "@/lib/db/schema";

export async function getSetting(key: string): Promise<string | null> {
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .get();
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

export async function getUserCount(): Promise<number> {
  const result = await db.select({ count: count() }).from(user).get();
  return result?.count ?? 0;
}

export async function isRegistrationOpen(): Promise<boolean> {
  const userCount = await getUserCount();
  if (userCount === 0) return true;

  const setting = await getSetting("registrationOpen");
  return setting === "true";
}
