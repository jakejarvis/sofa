import path from "node:path";
import { ORPCError } from "@orpc/server";
import { BACKUP_DIR } from "@sofa/config";
import {
  createBackup,
  deleteBackup,
  ensureBackupDir,
  listBackups,
  restoreFromBackup,
} from "@sofa/core/backup";
import { getSetting, setSetting } from "@sofa/core/settings";
import {
  getCachedUpdateCheck,
  isUpdateCheckEnabled,
} from "@sofa/core/update-check";
import { rescheduleBackup, triggerJob as triggerCronJob } from "../../cron";
import { os } from "../context";
import { admin } from "../middleware";

// ─── Backups ───────────────────────────────────────────────────

export const backupsList = os.admin.backups.list
  .use(admin)
  .handler(async () => {
    const backups = await listBackups();
    return { backups };
  });

export const backupsCreate = os.admin.backups.create
  .use(admin)
  .handler(async () => {
    return await createBackup();
  });

export const backupsDelete = os.admin.backups.delete
  .use(admin)
  .handler(async ({ input }) => {
    await deleteBackup(input.filename);
  });

export const backupsRestore = os.admin.backups.restore
  .use(admin)
  .handler(async ({ input: file }) => {
    // Stream upload to disk to avoid buffering the entire file in memory
    await ensureBackupDir();
    const tmpPath = path.join(
      BACKUP_DIR,
      `.upload-${Date.now()}-${crypto.randomUUID()}.db`,
    );
    try {
      await Bun.write(tmpPath, file);
      await restoreFromBackup(tmpPath);
    } catch (err) {
      // Clean up the upload file if restoreFromBackup didn't consume it
      const f = Bun.file(tmpPath);
      if (await f.exists()) await f.delete();
      throw err;
    }
  });

export const backupsSchedule = os.admin.backups.schedule
  .use(admin)
  .handler(() => {
    return {
      enabled: getSetting("scheduledBackups") === "true",
      maxRetention: Number.parseInt(
        getSetting("maxBackupRetention") ?? "7",
        10,
      ),
      frequency: (getSetting("backupScheduleFrequency") ?? "1d") as
        | "6h"
        | "12h"
        | "1d"
        | "7d",
      time: getSetting("backupScheduleTime") ?? "02:00",
      dayOfWeek: Number.parseInt(getSetting("backupScheduleDow") ?? "0", 10),
    };
  });

export const backupsUpdateSchedule = os.admin.backups.updateSchedule
  .use(admin)
  .handler(({ input }) => {
    if (input.enabled !== undefined)
      setSetting("scheduledBackups", String(input.enabled));
    if (input.frequency !== undefined)
      setSetting("backupScheduleFrequency", input.frequency);
    if (input.time !== undefined) setSetting("backupScheduleTime", input.time);
    if (input.dayOfWeek !== undefined)
      setSetting("backupScheduleDow", String(input.dayOfWeek));
    if (input.maxRetention !== undefined)
      setSetting("maxBackupRetention", String(input.maxRetention));

    if (input.frequency || input.time || input.dayOfWeek !== undefined) {
      rescheduleBackup();
    }
  });

// ─── Registration ──────────────────────────────────────────────

export const registration = os.admin.registration.use(admin).handler(() => {
  return { open: getSetting("registrationOpen") === "true" };
});

export const toggleRegistration = os.admin.toggleRegistration
  .use(admin)
  .handler(({ input }) => {
    setSetting("registrationOpen", String(input.open));
  });

// ─── Update Check ──────────────────────────────────────────────

export const updateCheck = os.admin.updateCheck.use(admin).handler(() => {
  const enabled = isUpdateCheckEnabled();
  const check = enabled ? getCachedUpdateCheck() : null;
  return { enabled, updateCheck: check };
});

export const toggleUpdateCheck = os.admin.toggleUpdateCheck
  .use(admin)
  .handler(({ input }) => {
    setSetting("updateCheckEnabled", String(input.enabled));
  });

// ─── Jobs ──────────────────────────────────────────────────────

export const triggerJob = os.admin.triggerJob
  .use(admin)
  .handler(async ({ input }) => {
    const triggered = await triggerCronJob(input.name);
    if (!triggered) {
      throw new ORPCError("NOT_FOUND", { message: "Job not found" });
    }
    return { ok: true as const };
  });
