"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import {
  type BackupInfo,
  createBackup,
  deleteBackup,
  listBackups,
} from "@/lib/services/backup";
import { getSetting, setSetting } from "@/lib/services/settings";

async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "admin") throw new Error("Forbidden");
  return session;
}

export async function createBackupAction(): Promise<BackupInfo> {
  await getAdminSession();
  return await createBackup();
}

export async function listBackupsAction(): Promise<BackupInfo[]> {
  await getAdminSession();
  return await listBackups();
}

export async function deleteBackupAction(filename: string): Promise<void> {
  await getAdminSession();
  await deleteBackup(filename);
}

export async function setScheduledBackupAction(
  enabled: boolean,
): Promise<void> {
  await getAdminSession();
  setSetting("scheduledBackups", String(enabled));
}

export async function getScheduledBackupSettings(): Promise<{
  enabled: boolean;
  maxRetention: number;
}> {
  await getAdminSession();
  return {
    enabled: getSetting("scheduledBackups") === "true",
    maxRetention: Number.parseInt(getSetting("maxBackupRetention") ?? "7", 10),
  };
}

export async function setMaxBackupsAction(max: number): Promise<void> {
  await getAdminSession();
  if (max < 1 || max > 30)
    throw new Error("Max backups must be between 1 and 30");
  setSetting("maxBackupRetention", String(max));
}
