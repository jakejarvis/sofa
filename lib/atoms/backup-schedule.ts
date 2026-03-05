import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  setBackupScheduleAction,
  setMaxBackupsAction,
  setScheduledBackupAction,
} from "@/lib/actions/settings";
import type { BackupFrequency } from "@/lib/cron";

export interface BackupScheduleState {
  enabled: boolean;
  maxRetention: number;
  frequency: BackupFrequency;
  time: string;
  dow: number;
}

export const backupScheduleAtom = atom<BackupScheduleState>({
  enabled: false,
  maxRetention: 7,
  frequency: "1d",
  time: "03:00",
  dow: 0,
});

export const savingScheduleAtom = atom(false);
export const togglingScheduleAtom = atom(false);

export function useBackupScheduleActions() {
  const [schedule, setSchedule] = useAtom(backupScheduleAtom);
  const [, setSavingSchedule] = useAtom(savingScheduleAtom);
  const [, setTogglingSchedule] = useAtom(togglingScheduleAtom);

  const toggleScheduled = useCallback(
    async (checked: boolean) => {
      const previous = schedule.enabled;
      setSchedule((prev) => ({ ...prev, enabled: checked }));
      setTogglingSchedule(true);
      try {
        await setScheduledBackupAction(checked);
        toast.success(
          checked ? "Scheduled backups enabled" : "Scheduled backups disabled",
        );
      } catch {
        setSchedule((prev) => ({ ...prev, enabled: previous }));
        toast.error("Failed to update scheduled backup setting");
      } finally {
        setTogglingSchedule(false);
      }
    },
    [schedule.enabled, setSchedule, setTogglingSchedule],
  );

  const changeMaxRetention = useCallback(
    async (value: number) => {
      const previous = schedule.maxRetention;
      setSchedule((prev) => ({ ...prev, maxRetention: value }));
      try {
        await setMaxBackupsAction(value);
      } catch {
        setSchedule((prev) => ({ ...prev, maxRetention: previous }));
        toast.error("Failed to update retention setting");
      }
    },
    [schedule.maxRetention, setSchedule],
  );

  const changeSchedule = useCallback(
    async (
      newFrequency: BackupFrequency,
      newTime: string,
      newDow = schedule.dow,
    ) => {
      const prev = {
        frequency: schedule.frequency,
        time: schedule.time,
        dow: schedule.dow,
      };
      setSchedule((s) => ({
        ...s,
        frequency: newFrequency,
        time: newTime,
        dow: newDow,
      }));
      setSavingSchedule(true);
      try {
        await setBackupScheduleAction(newFrequency, newTime, newDow);
        toast.success("Schedule updated");
      } catch {
        setSchedule((s) => ({ ...s, ...prev }));
        toast.error("Failed to update schedule");
      } finally {
        setSavingSchedule(false);
      }
    },
    [
      schedule.frequency,
      schedule.time,
      schedule.dow,
      setSchedule,
      setSavingSchedule,
    ],
  );

  return { toggleScheduled, changeMaxRetention, changeSchedule };
}
