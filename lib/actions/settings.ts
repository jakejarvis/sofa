"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { type BackupFrequency, rescheduleBackup, triggerJob } from "@/lib/cron";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import {
  type BackupInfo,
  createBackup,
  deleteBackup,
  listBackups,
  restoreFromBackup,
} from "@/lib/services/backup";
import { getSetting, setSetting } from "@/lib/services/settings";
import {
  getSystemHealth,
  type SystemHealthData,
} from "@/lib/services/system-health";
import {
  getCachedUpdateCheck,
  type UpdateCheckResult,
} from "@/lib/services/update-check";

const providerSchema = z.enum(["plex", "jellyfin", "emby", "sonarr", "radarr"]);

const LIST_PROVIDERS = new Set(["sonarr", "radarr"]);

function integrationTypeFor(provider: string): "webhook" | "list" {
  return LIST_PROVIDERS.has(provider) ? "list" : "webhook";
}

function generateToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "hex",
  );
}

// --- Integration actions ---

export async function saveIntegration(provider: string, enabled?: boolean) {
  const session = await requireSession();
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
  const session = await requireSession();
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
  const session = await requireSession();
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
  await requireAdmin();
  setSetting("registrationOpen", String(open));
}

export async function toggleUpdateCheck(enabled: boolean) {
  await requireAdmin();
  setSetting("updateCheckEnabled", String(enabled));
}

// --- Backup actions ---

export async function createBackupAction(): Promise<BackupInfo> {
  await requireAdmin();
  return await createBackup();
}

export async function listBackupsAction(): Promise<BackupInfo[]> {
  await requireAdmin();
  return await listBackups();
}

export async function deleteBackupAction(filename: string): Promise<void> {
  await requireAdmin();
  await deleteBackup(filename);
}

export async function setScheduledBackupAction(
  enabled: boolean,
): Promise<void> {
  await requireAdmin();
  setSetting("scheduledBackups", String(enabled));
}

export async function getScheduledBackupSettings(): Promise<{
  enabled: boolean;
  maxRetention: number;
}> {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const parsed = backupScheduleSchema.parse({ frequency, time, dayOfWeek });
  setSetting("backupScheduleFrequency", parsed.frequency);
  setSetting("backupScheduleTime", parsed.time);
  setSetting("backupScheduleDow", String(parsed.dayOfWeek));
  rescheduleBackup();
}

// --- System health actions ---

export async function getSystemHealthAction(): Promise<SystemHealthData> {
  await requireAdmin();
  return getSystemHealth();
}

// --- Job trigger action ---

export async function triggerJobAction(
  jobName: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!jobName || typeof jobName !== "string") {
    throw new Error("Missing job name");
  }
  const triggered = await triggerJob(jobName);
  if (!triggered) throw new Error("Job not found");
  return { ok: true };
}

// --- Backup restore action ---

const MAX_RESTORE_SIZE = 500 * 1024 * 1024; // 500MB

export async function restoreBackupAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");
  if (file.size > MAX_RESTORE_SIZE) throw new Error("File too large");
  const buffer = Buffer.from(await file.arrayBuffer());
  await restoreFromBackup(buffer);
}

// --- Update check action ---

export async function getUpdateCheckAction(): Promise<UpdateCheckResult | null> {
  try {
    await requireAdmin();
    return getCachedUpdateCheck();
  } catch {
    return null;
  }
}
