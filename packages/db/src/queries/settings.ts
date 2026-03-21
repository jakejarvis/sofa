import { asc, count, eq } from "drizzle-orm";

import { db } from "../client";
import { appSettings, user } from "../schema";

const INITIAL_ADMIN_KEY = "initialAdminAssigned";

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

export function claimInitialAdmin(userId: string): boolean {
  let claimed = false;

  db.transaction((tx) => {
    const firstUser = tx
      .select({ id: user.id })
      .from(user)
      .orderBy(asc(user.createdAt), asc(user.id))
      .limit(1)
      .get();
    if (!firstUser || firstUser.id !== userId) {
      return;
    }

    const lock = tx
      .insert(appSettings)
      .values({ key: INITIAL_ADMIN_KEY, value: userId })
      .onConflictDoNothing()
      .returning({ key: appSettings.key })
      .get();
    if (!lock) {
      return;
    }

    tx.update(user).set({ role: "admin" }).where(eq(user.id, userId)).run();
    tx.insert(appSettings)
      .values({ key: "registrationOpen", value: "false" })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: "false" },
      })
      .run();

    claimed = true;
  });

  return claimed;
}
