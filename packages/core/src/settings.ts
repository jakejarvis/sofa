import {
  claimInitialAdmin as queryClaimInitialAdmin,
  getSettingValue,
  getUserCount as queryGetUserCount,
  upsertSetting,
} from "@sofa/db/queries/settings";

export function getSetting(key: string): string | null {
  return getSettingValue(key);
}

export function setSetting(key: string, value: string): void {
  upsertSetting(key, value);
}

export function getUserCount(): number {
  return queryGetUserCount();
}

export function claimInitialAdmin(userId: string): boolean {
  return queryClaimInitialAdmin(userId);
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
