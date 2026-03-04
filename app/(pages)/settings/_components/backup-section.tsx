"use client";

import {
  IconCalendarRepeat,
  IconChevronDown,
  IconClock,
  IconCloudDownload,
  IconCloudUpload,
  IconDatabaseExport,
  IconPlus,
  IconPointer,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import { format, formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BackupFrequency } from "@/lib/cron";
import type { BackupInfo } from "@/lib/services/backup";
import {
  createBackupAction,
  deleteBackupAction,
  setBackupScheduleAction,
  setMaxBackupsAction,
  setScheduledBackupAction,
} from "./actions";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, h:mm a");
}

const FREQUENCY_OPTIONS: { value: BackupFrequency; label: string }[] = [
  { value: "6h", label: "6h" },
  { value: "12h", label: "12h" },
  { value: "1d", label: "1d" },
  { value: "7d", label: "7d" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function getNextBackupDate(
  frequency: BackupFrequency,
  time: string,
  dayOfWeek: number,
): Date {
  const now = new Date();
  const [h, m] = time.split(":").map(Number);

  if (frequency === "6h") {
    const next = new Date(now);
    const currentHour = next.getHours();
    const nextHour = Math.ceil((currentHour + 1) / 6) * 6;
    next.setHours(nextHour, m, 0, 0);
    if (next <= now) next.setHours(next.getHours() + 6);
    return next;
  }

  if (frequency === "12h") {
    const next = new Date(now);
    const h2 = (h + 12) % 24;
    const candidates = [h, h2].sort((a, b) => a - b);
    for (const candidate of candidates) {
      next.setHours(candidate, m, 0, 0);
      if (next > now) return next;
    }
    next.setDate(next.getDate() + 1);
    next.setHours(candidates[0], m, 0, 0);
    return next;
  }

  if (frequency === "7d") {
    const next = new Date(now);
    const daysUntil = (dayOfWeek - next.getDay() + 7) % 7;
    if (daysUntil === 0) {
      next.setHours(h, m, 0, 0);
      if (next > now) return next;
      next.setDate(next.getDate() + 7);
      next.setHours(h, m, 0, 0);
      return next;
    }
    next.setDate(next.getDate() + daysUntil);
    next.setHours(h, m, 0, 0);
    return next;
  }

  // 1d
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

function formatNextBackup(
  frequency: BackupFrequency,
  time: string,
  dayOfWeek: number,
): string {
  const next = getNextBackupDate(frequency, time, dayOfWeek);
  return `Next backup ${formatDistanceToNow(next, { addSuffix: true })}`;
}

export function BackupSection({
  initialBackups,
  initialScheduledEnabled,
  initialMaxRetention,
  initialFrequency,
  initialTime,
  initialDow,
}: {
  initialBackups: BackupInfo[];
  initialScheduledEnabled: boolean;
  initialMaxRetention: number;
  initialFrequency: BackupFrequency;
  initialTime: string;
  initialDow: number;
}) {
  const [backups, setBackups] = useState<BackupInfo[]>(initialBackups);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [scheduledEnabled, setScheduledEnabled] = useState(
    initialScheduledEnabled,
  );
  const [maxRetention, setMaxRetention] = useState(initialMaxRetention);
  const [frequency, setFrequency] = useState<BackupFrequency>(initialFrequency);
  const [time, setTime] = useState(initialTime);
  const [dow, setDow] = useState(initialDow);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [togglingSchedule, setTogglingSchedule] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCreateBackup() {
    setCreating(true);
    try {
      const backup = await createBackupAction();
      setBackups((prev) => [backup, ...prev]);
      toast.success("Backup created", {
        action: {
          label: "Download",
          onClick: () => {
            const a = document.createElement("a");
            a.href = `/api/backup/${backup.filename}`;
            a.download = backup.filename;
            a.click();
          },
        },
      });
    } catch {
      toast.error("Failed to create backup");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(filename: string) {
    const previous = backups;
    setDeleting(filename);
    setBackups((prev) => prev.filter((b) => b.filename !== filename));
    try {
      await deleteBackupAction(filename);
      toast.success("Backup deleted");
    } catch {
      setBackups(previous);
      toast.error("Failed to delete backup");
    } finally {
      setDeleting(null);
    }
  }

  async function handleRestore(file: File) {
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Restore failed");
      }
      toast.success("Database restored. Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Restore failed";
      toast.error(message);
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleToggleScheduled(checked: boolean) {
    const previous = scheduledEnabled;
    setScheduledEnabled(checked);
    setTogglingSchedule(true);
    try {
      await setScheduledBackupAction(checked);
      toast.success(
        checked ? "Scheduled backups enabled" : "Scheduled backups disabled",
      );
    } catch {
      setScheduledEnabled(previous);
      toast.error("Failed to update scheduled backup setting");
    } finally {
      setTogglingSchedule(false);
    }
  }

  async function handleMaxRetentionChange(value: number) {
    const previous = maxRetention;
    setMaxRetention(value);
    try {
      await setMaxBackupsAction(value);
    } catch {
      setMaxRetention(previous);
      toast.error("Failed to update retention setting");
    }
  }

  async function handleScheduleChange(
    newFrequency: BackupFrequency,
    newTime: string,
    newDow = dow,
  ) {
    const prevFreq = frequency;
    const prevTime = time;
    const prevDow = dow;
    setFrequency(newFrequency);
    setTime(newTime);
    setDow(newDow);
    setSavingSchedule(true);
    try {
      await setBackupScheduleAction(newFrequency, newTime, newDow);
      toast.success("Schedule updated");
    } catch {
      setFrequency(prevFreq);
      setTime(prevTime);
      setDow(prevDow);
      toast.error("Failed to update schedule");
    } finally {
      setSavingSchedule(false);
    }
  }

  return (
    <>
      {/* Create backup header */}
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconDatabaseExport className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle>Database backups</CardTitle>
              <CardDescription>
                {backups.length > 0
                  ? `${backups.length} backup${backups.length !== 1 ? "s" : ""} stored`
                  : "No backups yet"}
              </CardDescription>
            </div>
          </div>
          <Button onClick={handleCreateBackup} disabled={creating}>
            {creating ? <Spinner className="size-3" /> : <IconPlus />}
            {creating ? "Creating..." : "New backup"}
          </Button>
        </div>
      </CardContent>

      {/* Backup list */}
      <AnimatePresence initial={false}>
        {backups.length > 0 && (
          <CardContent className="border-t border-border/30 pt-4">
            <div className="space-y-1.5">
              {backups.map((backup) => (
                <motion.div
                  key={backup.filename}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="group flex items-center gap-3 rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted/40">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="flex shrink-0 items-center text-muted-foreground" />
                        }
                      >
                        {backup.source === "scheduled" ? (
                          <IconClock className="size-3.5" />
                        ) : backup.source === "pre-restore" ? (
                          <IconShieldCheck className="size-3.5" />
                        ) : (
                          <IconPointer className="size-3.5" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        {backup.source === "scheduled"
                          ? "Scheduled backup"
                          : backup.source === "pre-restore"
                            ? "Pre-restore backup"
                            : "Manual backup"}
                      </TooltipContent>
                    </Tooltip>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {formatBackupDate(backup.createdAt)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatBytes(backup.sizeBytes)}
                        </span>
                        <span
                          className="text-[11px] text-muted-foreground/50"
                          suppressHydrationWarning
                        >
                          {formatDistanceToNow(new Date(backup.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                              nativeButton={false}
                              render={
                                <a
                                  href={`/api/backup/${backup.filename}`}
                                  download
                                  aria-label="Download backup"
                                >
                                  <IconCloudDownload />
                                </a>
                              }
                            />
                          }
                        />
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <Tooltip>
                          <AlertDialogTrigger
                            render={
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-muted-foreground hover:text-destructive"
                                    disabled={deleting === backup.filename}
                                  />
                                }
                              />
                            }
                          >
                            {deleting === backup.filename ? (
                              <Spinner />
                            ) : (
                              <IconTrash />
                            )}
                          </AlertDialogTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the backup from{" "}
                              <strong>
                                {formatBackupDate(backup.createdAt)}
                              </strong>
                              . This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleDelete(backup.filename)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        )}
      </AnimatePresence>

      {/* Scheduled backups */}
      <CardContent className="border-t border-border/30 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
              <IconCalendarRepeat className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Scheduled</CardTitle>
              <CardDescription>
                {scheduledEnabled ? (
                  <span className="inline-flex flex-wrap items-baseline gap-1">
                    <span suppressHydrationWarning>
                      {formatNextBackup(frequency, time, dow)}.
                    </span>{" "}
                    Keeping last{" "}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-0.5 border-b border-dotted border-muted-foreground/50 transition-colors hover:text-foreground">
                        {maxRetention}
                        <IconChevronDown className="size-2.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup
                          value={String(maxRetention)}
                          onValueChange={(v) =>
                            handleMaxRetentionChange(Number(v))
                          }
                        >
                          {[3, 5, 7, 14, 30].map((n) => (
                            <DropdownMenuRadioItem key={n} value={String(n)}>
                              {n}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>{" "}
                    backups.
                  </span>
                ) : (
                  "Automatically back up your database on a schedule"
                )}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={scheduledEnabled}
            onCheckedChange={handleToggleScheduled}
            disabled={togglingSchedule}
          />
        </div>

        {/* Schedule configurator */}
        <AnimatePresence initial={false}>
          {scheduledEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 ml-11 space-y-3">
                {/* Frequency selector */}
                <div className="space-y-1.5">
                  <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Frequency
                  </span>
                  <div className="flex gap-1">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant="outline"
                        size="sm"
                        disabled={savingSchedule}
                        onClick={() => handleScheduleChange(opt.value, time)}
                        className={
                          frequency === opt.value
                            ? "border-primary/50 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                            : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Day of week — shown for 7d only */}
                <AnimatePresence initial={false}>
                  {frequency === "7d" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        Day:{" "}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50">
                          {DAYS_OF_WEEK[dow]}
                          <IconChevronDown className="size-3 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuRadioGroup
                            value={String(dow)}
                            onValueChange={(v) =>
                              handleScheduleChange(frequency, time, Number(v))
                            }
                          >
                            {DAYS_OF_WEEK.map((day, i) => (
                              <DropdownMenuRadioItem
                                key={day}
                                value={String(i)}
                              >
                                {day}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Time selector — shown for 12h, 1d, 7d */}
                <AnimatePresence initial={false}>
                  {frequency !== "6h" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {frequency === "12h" ? "Starting at" : "Time:"}{" "}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50">
                          {format(
                            new Date(
                              2000,
                              0,
                              1,
                              ...(time.split(":").map(Number) as [
                                number,
                                number,
                              ]),
                            ),
                            "h:mm a",
                          )}
                          <IconChevronDown className="size-3 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuRadioGroup
                            value={time}
                            onValueChange={(v) =>
                              handleScheduleChange(frequency, v)
                            }
                          >
                            {HOURS.map((h) => {
                              const val = `${String(h).padStart(2, "0")}:00`;
                              return (
                                <DropdownMenuRadioItem key={h} value={val}>
                                  {format(new Date(2000, 0, 1, h, 0), "h:mm a")}
                                </DropdownMenuRadioItem>
                              );
                            })}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Restore */}
      <CardContent className="border-t border-border/30 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
              <IconCloudUpload className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Restore</CardTitle>
              <CardDescription>
                Upload a .db file to replace the current database. A
                "just-in-case" backup is created first.
              </CardDescription>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".db"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFile(file);
                setRestoreDialogOpen(true);
              }
            }}
          />
          <RestoreDialog
            open={restoreDialogOpen}
            onOpenChange={setRestoreDialogOpen}
            onConfirm={() => {
              if (selectedFile) handleRestore(selectedFile);
              setRestoreDialogOpen(false);
              setSelectedFile(null);
            }}
            onCancel={() => {
              setRestoreDialogOpen(false);
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
          >
            {restoring ? <Spinner /> : <IconCloudUpload />}
            {restoring ? "Restoring..." : "Upload"}
          </Button>
        </div>
      </CardContent>
    </>
  );
}

function RestoreDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore database?</AlertDialogTitle>
          <AlertDialogDescription>
            This will replace your entire database with the uploaded file. A
            "just-in-case" backup of your current data will be created first.
            Active sessions may need to refresh after restore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Restore</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
