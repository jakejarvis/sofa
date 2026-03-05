"use client";

import {
  IconClock,
  IconCloudDownload,
  IconDatabaseExport,
  IconPlus,
  IconPointer,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import { format, formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createBackupAction, deleteBackupAction } from "@/lib/actions/settings";
import type { BackupInfo } from "@/lib/services/backup";

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
}: {
  initialBackups: BackupInfo[];
}) {
  const [backups, setBackups] = useState<BackupInfo[]>(initialBackups);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  return (
    <>
      {/* Header */}
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
    </>
  );
}
