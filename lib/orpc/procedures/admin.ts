import { ORPCError } from "@orpc/server";
import { rescheduleBackup, triggerJob } from "@/lib/cron";
import { createBackup, deleteBackup, listBackups } from "@/lib/services/backup";
import { getSetting, setSetting } from "@/lib/services/settings";
import {
  getCachedUpdateCheck,
  isUpdateCheckEnabled,
} from "@/lib/services/update-check";
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

export const backupsSchedule = os.admin.backups.schedule
  .use(admin)
  .handler(() => {
    return {
      enabled: getSetting("scheduledBackups") === "true",
      maxRetention: Number.parseInt(
        getSetting("maxBackupRetention") ?? "7",
        10,
      ),
      frequency: getSetting("backupScheduleFrequency") ?? "1d",
      time: getSetting("backupScheduleTime") ?? "03:00",
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

export const triggerJobProcedure = os.admin.triggerJob
  .use(admin)
  .handler(async ({ input }) => {
    const triggered = await triggerJob(input.name);
    if (!triggered) {
      throw new ORPCError("NOT_FOUND", { message: "Job not found" });
    }
    return { ok: true as const };
  });
