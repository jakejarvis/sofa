"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { type BackupFrequency, rescheduleBackup } from "@/lib/cron";
import { db } from "@/lib/db/client";
import { webhookConnections } from "@/lib/db/schema";
import {
  type BackupInfo,
  createBackup,
  deleteBackup,
  listBackups,
} from "@/lib/services/backup";
import { getSetting, setSetting } from "@/lib/services/settings";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

async function getAdminSession() {
  const session = await getSession();
  if (session.user.role !== "admin") throw new Error("Forbidden");
  return session;
}

// --- Webhook actions ---

export async function saveWebhookConnection(
  provider: "plex" | "jellyfin",
  mediaServerUsername: string,
  enabled?: boolean,
) {
  const session = await getSession();

  if (!["plex", "jellyfin"].includes(provider)) {
    throw new Error("Invalid provider");
  }
  if (!mediaServerUsername?.trim()) {
    throw new Error("Media server username is required");
  }

  const existing = db
    .select()
    .from(webhookConnections)
    .where(
      and(
        eq(webhookConnections.userId, session.user.id),
        eq(webhookConnections.provider, provider),
      ),
    )
    .get();

  if (existing) {
    const connection = db
      .update(webhookConnections)
      .set({
        mediaServerUsername: mediaServerUsername.trim(),
        enabled: typeof enabled === "boolean" ? enabled : existing.enabled,
      })
      .where(eq(webhookConnections.id, existing.id))
      .returning()
      .get();
    return {
      ...connection,
      lastEventAt: connection.lastEventAt?.toISOString() ?? null,
      createdAt: connection.createdAt.toISOString(),
    };
  }

  const token = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32)),
  ).toString("hex");
  const now = new Date();

  const connection = db
    .insert(webhookConnections)
    .values({
      userId: session.user.id,
      provider,
      token,
      mediaServerUsername: mediaServerUsername.trim(),
      enabled: true,
      createdAt: now,
    })
    .returning()
    .get();

  return {
    ...connection,
    lastEventAt: connection.lastEventAt?.toISOString() ?? null,
    createdAt: connection.createdAt.toISOString(),
  };
}

export async function deleteWebhookConnection(provider: "plex" | "jellyfin") {
  const session = await getSession();

  if (!["plex", "jellyfin"].includes(provider)) {
    throw new Error("Invalid provider");
  }

  db.delete(webhookConnections)
    .where(
      and(
        eq(webhookConnections.userId, session.user.id),
        eq(webhookConnections.provider, provider),
      ),
    )
    .run();
}

export async function regenerateWebhookToken(provider: "plex" | "jellyfin") {
  const session = await getSession();

  if (!["plex", "jellyfin"].includes(provider)) {
    throw new Error("Invalid provider");
  }

  const newToken = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32)),
  ).toString("hex");

  const connection = db
    .update(webhookConnections)
    .set({ token: newToken })
    .where(
      and(
        eq(webhookConnections.userId, session.user.id),
        eq(webhookConnections.provider, provider),
      ),
    )
    .returning()
    .get();

  if (!connection) {
    throw new Error("Connection not found");
  }

  return {
    ...connection,
    lastEventAt: connection.lastEventAt?.toISOString() ?? null,
    createdAt: connection.createdAt.toISOString(),
  };
}

export async function toggleRegistration(open: boolean) {
  await getAdminSession();
  setSetting("registrationOpen", String(open));
}

// --- Backup actions ---

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

const VALID_FREQUENCIES: BackupFrequency[] = ["6h", "12h", "1d", "7d"];

export async function setBackupScheduleAction(
  frequency: BackupFrequency,
  time: string,
  dayOfWeek = 0,
): Promise<void> {
  await getAdminSession();
  if (!VALID_FREQUENCIES.includes(frequency))
    throw new Error("Invalid frequency");
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("Invalid time format");
  const [h, m] = time.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error("Invalid time value");
  if (dayOfWeek < 0 || dayOfWeek > 6) throw new Error("Invalid day of week");
  setSetting("backupScheduleFrequency", frequency);
  setSetting("backupScheduleTime", time);
  setSetting("backupScheduleDow", String(dayOfWeek));
  rescheduleBackup();
}
