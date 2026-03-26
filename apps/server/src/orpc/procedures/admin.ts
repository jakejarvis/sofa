import path from "node:path";

import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import { BACKUP_DIR } from "@sofa/config";
import {
  createBackup,
  deleteBackup,
  ensureBackupDir,
  listBackups,
  restoreFromBackup,
} from "@sofa/core/backup";
import {
  purgeImageCache as purgeImagesFn,
  purgeMetadataCache as purgeMetadataFn,
} from "@sofa/core/cache";
import { getSetting, setSetting } from "@sofa/core/settings";
import { getSystemHealth } from "@sofa/core/system-health";
import { isTelemetryEnabled } from "@sofa/core/telemetry";
import { getCachedUpdateCheck, isUpdateCheckEnabled } from "@sofa/core/update-check";

import { pauseJobs, rescheduleBackup, resumeJobs, triggerJob as triggerCronJob } from "../../cron";
import { os } from "../context";
import { admin } from "../middleware";

// ─── Settings (consolidated) ──────────────────────────────────

export const settingsGet = os.admin.settings.get.use(admin).handler(() => {
  const updateCheckEnabled = isUpdateCheckEnabled();
  const check = updateCheckEnabled ? getCachedUpdateCheck() : null;

  return {
    registration: {
      open: getSetting("registrationOpen") === "true",
    },
    updateCheck: {
      enabled: updateCheckEnabled,
      updateAvailable: check?.updateAvailable ?? null,
      currentVersion: check?.currentVersion ?? null,
      latestVersion: check?.latestVersion ?? null,
      releaseUrl: check?.releaseUrl ?? null,
      lastCheckedAt: check?.lastCheckedAt ?? null,
    },
    telemetry: {
      enabled: isTelemetryEnabled(),
      lastReportedAt: getSetting("telemetryLastReportedAt") ?? null,
    },
  };
});

export const settingsUpdate = os.admin.settings.update.use(admin).handler(({ input }) => {
  if (input.registration) {
    setSetting("registrationOpen", String(input.registration.open));
  }
  if (input.updateCheck) {
    setSetting("updateCheckEnabled", String(input.updateCheck.enabled));
  }
  if (input.telemetry) {
    setSetting("telemetryEnabled", String(input.telemetry.enabled));
  }
});

// ─── Backups ──────────────────────────────────────────────────

export const backupsList = os.admin.backups.list.use(admin).handler(async () => {
  const backups = await listBackups();
  return { backups };
});

export const backupsCreate = os.admin.backups.create.use(admin).handler(async () => {
  return await createBackup();
});

export const backupsDelete = os.admin.backups.delete.use(admin).handler(async ({ input }) => {
  await deleteBackup(input.filename);
});

export const backupsRestore = os.admin.backups.restore
  .use(admin)
  .handler(async ({ input: file }) => {
    await ensureBackupDir();
    const tmpPath = path.join(BACKUP_DIR, `.upload-${Date.now()}-${crypto.randomUUID()}.db`);
    pauseJobs();
    try {
      await Bun.write(tmpPath, file);
      await restoreFromBackup(tmpPath);
    } catch (err) {
      const f = Bun.file(tmpPath);
      if (await f.exists()) await f.delete();
      if (err instanceof ORPCError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new ORPCError("BAD_REQUEST", {
        message: msg,
        data: { code: AppErrorCode.BACKUP_RESTORE_FAILED },
      });
    } finally {
      resumeJobs();
    }
  });

export const backupsSchedule = os.admin.backups.schedule.use(admin).handler(() => {
  return {
    enabled: getSetting("scheduledBackups") === "true",
    maxRetention: Number.parseInt(getSetting("maxBackupRetention") ?? "7", 10),
    frequency: (getSetting("backupScheduleFrequency") ?? "1d") as "6h" | "12h" | "1d" | "7d",
    time: getSetting("backupScheduleTime") ?? "02:00",
    dayOfWeek: Number.parseInt(getSetting("backupScheduleDow") ?? "0", 10),
  };
});

export const backupsUpdateSchedule = os.admin.backups.updateSchedule
  .use(admin)
  .handler(({ input }) => {
    if (input.enabled !== undefined) setSetting("scheduledBackups", String(input.enabled));
    if (input.frequency !== undefined) setSetting("backupScheduleFrequency", input.frequency);
    if (input.time !== undefined) setSetting("backupScheduleTime", input.time);
    if (input.dayOfWeek !== undefined) setSetting("backupScheduleDow", String(input.dayOfWeek));
    if (input.maxRetention !== undefined)
      setSetting("maxBackupRetention", String(input.maxRetention));

    if (input.frequency || input.time || input.dayOfWeek !== undefined) {
      rescheduleBackup();
    }
  });

// ─── Jobs ─────────────────────────────────────────────────────

export const triggerJob = os.admin.triggerJob.use(admin).handler(async ({ input }) => {
  const triggered = await triggerCronJob(input.name);
  if (!triggered) {
    throw new ORPCError("NOT_FOUND", {
      message: "Job not found",
      data: { code: AppErrorCode.JOB_NOT_FOUND },
    });
  }
  return { ok: true as const };
});

// ─── Purge ────────────────────────────────────────────────────

export const purgeMetadataCache = os.admin.purgeMetadataCache
  .use(admin)
  .handler(() => purgeMetadataFn());

export const purgeImageCache = os.admin.purgeImageCache
  .use(admin)
  .handler(async () => purgeImagesFn());

// ─── System Health ────────────────────────────────────────────

export const systemHealth = os.admin.systemHealth.use(admin).handler(async () => {
  return await getSystemHealth();
});
