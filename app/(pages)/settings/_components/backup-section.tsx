"use client";

import {
  IconCalendarRepeat,
  IconCloudDownload,
  IconCloudUpload,
  IconDatabaseExport,
  IconPlus,
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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { BackupInfo } from "@/lib/services/backup";
import {
  createBackupAction,
  deleteBackupAction,
  setMaxBackupsAction,
  setScheduledBackupAction,
} from "./backup-actions";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, h:mm a");
}

export function BackupSection({
  initialBackups,
  initialScheduledEnabled,
  initialMaxRetention,
}: {
  initialBackups: BackupInfo[];
  initialScheduledEnabled: boolean;
  initialMaxRetention: number;
}) {
  const [backups, setBackups] = useState<BackupInfo[]>(initialBackups);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [scheduledEnabled, setScheduledEnabled] = useState(
    initialScheduledEnabled,
  );
  const [maxRetention, setMaxRetention] = useState(initialMaxRetention);
  const [togglingSchedule, setTogglingSchedule] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCreateBackup() {
    setCreating(true);
    try {
      const backup = await createBackupAction();
      setBackups((prev) => [backup, ...prev]);
      toast.success("Backup created");
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
              <CardTitle>Database snapshots</CardTitle>
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {formatBackupDate(backup.createdAt)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatBytes(backup.sizeBytes)}
                        </span>
                        <span className="text-[11px] text-muted-foreground/50">
                          {formatDistanceToNow(new Date(backup.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {backup.filename.startsWith("pre-restore") && (
                        <span className="text-[10px] text-primary/70">
                          Pre-restore safety backup
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        nativeButton={false}
                        render={
                          <a
                            href={`/api/backup/${backup.filename}`}
                            download
                            title="Download"
                            aria-label="Download backup"
                          >
                            <IconCloudDownload />
                          </a>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={deleting === backup.filename}
                              title="Delete"
                            />
                          }
                        >
                          {deleting === backup.filename ? (
                            <Spinner />
                          ) : (
                            <IconTrash />
                          )}
                        </AlertDialogTrigger>
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
                Upload a .db file to replace the current database. A safety
                backup is created first.
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

      {/* Scheduled backups */}
      <CardContent className="border-t border-border/30 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
              <IconCalendarRepeat className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Scheduled backups</CardTitle>
              <CardDescription>
                Daily at 2:00 AM
                {scheduledEnabled && (
                  <span className="text-muted-foreground/50">
                    {" "}
                    &middot; keeping last{" "}
                    <select
                      value={maxRetention}
                      onChange={(e) =>
                        handleMaxRetentionChange(Number(e.target.value))
                      }
                      className="inline h-auto appearance-none border-b border-dashed border-muted-foreground/30 bg-transparent px-0.5 text-xs text-muted-foreground outline-none hover:border-muted-foreground/60 focus:border-primary"
                    >
                      {[3, 5, 7, 14, 30].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </span>
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
            safety backup of your current data will be created first. Active
            sessions may need to refresh after restore.
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
