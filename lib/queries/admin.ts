import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { BackupInfo } from "@/lib/services/backup";

// ----- Query key factories -----

export const adminKeys = {
  backups: ["admin-backups"] as const,
  backupSchedule: ["admin-backup-schedule"] as const,
  registration: ["admin-registration"] as const,
  updateCheck: ["admin-update-check"] as const,
};

// ----- Response types -----

interface BackupsResponse {
  backups: BackupInfo[];
}

export interface BackupScheduleResponse {
  enabled: boolean;
  maxRetention: number;
  frequency: "6h" | "12h" | "1d" | "7d";
  time: string;
  dayOfWeek: number;
}

export interface RegistrationResponse {
  open: boolean;
}

export interface UpdateCheckResponse {
  enabled: boolean;
  updateCheck: {
    updateAvailable: boolean;
    latestVersion: string | null;
    releaseUrl: string | null;
  } | null;
}

// ----- Queries -----

export function useBackups() {
  return useQuery<BackupsResponse>({
    queryKey: adminKeys.backups,
    queryFn: () => api<BackupsResponse>("/admin/backups"),
  });
}

export function useBackupSchedule() {
  return useQuery<BackupScheduleResponse>({
    queryKey: adminKeys.backupSchedule,
    queryFn: () => api<BackupScheduleResponse>("/admin/backups/schedule"),
  });
}

export function useRegistration() {
  return useQuery<RegistrationResponse>({
    queryKey: adminKeys.registration,
    queryFn: () => api<RegistrationResponse>("/admin/registration"),
  });
}

export function useUpdateCheck() {
  return useQuery<UpdateCheckResponse>({
    queryKey: adminKeys.updateCheck,
    queryFn: () => api<UpdateCheckResponse>("/admin/update-check"),
  });
}
