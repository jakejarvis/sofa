"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { type BackupFrequency, rescheduleBackup } from "@/lib/cron";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import {
  type BackupInfo,
  createBackup,
  deleteBackup,
  listBackups,
} from "@/lib/services/backup";
import { getSetting, setSetting } from "@/lib/services/settings";

const providerSchema = z.enum(["plex", "jellyfin", "emby", "sonarr", "radarr"]);

const LIST_PROVIDERS = new Set(["sonarr", "radarr"]);

function integrationTypeFor(provider: string): "webhook" | "list" {
  return LIST_PROVIDERS.has(provider) ? "list" : "webhook";
}

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

function generateToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "hex",
  );
}

// --- Integration actions ---

export async function saveIntegration(provider: string, enabled?: boolean) {
  const session = await getSession();
  const parsed = providerSchema.parse(provider);

  const existing = db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, parsed),
      ),
    )
    .get();

  if (existing) {
    const row = db
      .update(integrations)
      .set({
        enabled: typeof enabled === "boolean" ? enabled : existing.enabled,
      })
      .where(eq(integrations.id, existing.id))
      .returning()
      .get();
    return {
      ...row,
      lastEventAt: row.lastEventAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  const row = db
    .insert(integrations)
    .values({
      userId: session.user.id,
      provider: parsed,
      type: integrationTypeFor(parsed),
      token: generateToken(),
      enabled: true,
      createdAt: new Date(),
    })
    .returning()
    .get();

  return {
    ...row,
    lastEventAt: row.lastEventAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function deleteIntegration(provider: string) {
  const session = await getSession();
  const parsed = providerSchema.parse(provider);

  db.delete(integrations)
    .where(
      and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, parsed),
      ),
    )
    .run();
}

export async function regenerateIntegrationToken(provider: string) {
  const session = await getSession();
  const parsed = providerSchema.parse(provider);

  const row = db
    .update(integrations)
    .set({ token: generateToken() })
    .where(
      and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, parsed),
      ),
    )
    .returning()
    .get();

  if (!row) throw new Error("Integration not found");

  return {
    ...row,
    lastEventAt: row.lastEventAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// --- Admin actions ---

export async function toggleRegistration(open: boolean) {
  await getAdminSession();
  setSetting("registrationOpen", String(open));
}

export async function toggleUpdateCheck(enabled: boolean) {
  await getAdminSession();
  setSetting("updateCheckEnabled", String(enabled));
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

const maxBackupsSchema = z
  .number()
  .int()
  .refine((n) => n === 0 || (n >= 1 && n <= 30), {
    message: "Max backups must be between 1 and 30, or 0 for unlimited",
  });

export async function setMaxBackupsAction(max: number): Promise<void> {
  await getAdminSession();
  maxBackupsSchema.parse(max);
  setSetting("maxBackupRetention", String(max));
}

const backupScheduleSchema = z.object({
  frequency: z.enum(["6h", "12h", "1d", "7d"]),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time format")
    .refine(
      (t) => {
        const [h, m] = t.split(":").map(Number);
        return h >= 0 && h <= 23 && m >= 0 && m <= 59;
      },
      { message: "Invalid time value" },
    ),
  dayOfWeek: z.number().int().min(0).max(6).default(0),
});

export async function setBackupScheduleAction(
  frequency: BackupFrequency,
  time: string,
  dayOfWeek = 0,
): Promise<void> {
  await getAdminSession();
  const parsed = backupScheduleSchema.parse({ frequency, time, dayOfWeek });
  setSetting("backupScheduleFrequency", parsed.frequency);
  setSetting("backupScheduleTime", parsed.time);
  setSetting("backupScheduleDow", String(parsed.dayOfWeek));
  rescheduleBackup();
}
