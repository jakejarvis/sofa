"use client";

import type { BackupInfo } from "@sofa/api/schemas";
import {
  IconClock,
  IconCloudDownload,
  IconDatabaseExport,
  IconPlus,
  IconPointer,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { orpc } from "@/lib/orpc/tanstack";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, h:mm a");
}

export function BackupSection() {
  const { data } = useQuery(orpc.admin.backups.list.queryOptions());
  const [backups, setBackups] = useState<BackupInfo[] | null>(null);

  // Use local state if user has modified, else use query data
  const displayBackups = backups ?? data?.backups ?? [];

  const createMutation = useMutation(
    orpc.admin.backups.create.mutationOptions({
      onSuccess: (backup) => {
        setBackups((prev) => [
          backup as BackupInfo,
          ...(prev ?? data?.backups ?? []).filter(
            (b: BackupInfo) => b.filename !== backup.filename,
          ),
        ]);
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
      },
      onError: () => toast.error("Failed to create backup"),
    }),
  );

  const deleteMutation = useMutation(
    orpc.admin.backups.delete.mutationOptions({
      onMutate: ({ filename }) => {
        const previous = displayBackups;
        setBackups(
          displayBackups.filter((b: BackupInfo) => b.filename !== filename),
        );
        return { previous };
      },
      onSuccess: () => toast.success("Backup deleted"),
      onError: (_, __, ctx) => {
        if (ctx?.previous) setBackups(ctx.previous);
        toast.error("Failed to delete backup");
      },
    }),
  );

  const creating = createMutation.isPending;
  const deleting = deleteMutation.isPending
    ? (deleteMutation.variables?.filename ?? null)
    : null;

  return (
    <>
      {/* Header */}
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconDatabaseExport
                aria-hidden={true}
                className="size-4 text-primary"
              />
            </div>
            <div>
              <CardTitle>Database backups</CardTitle>
              <CardDescription>
                {displayBackups.length > 0
                  ? `${displayBackups.length} backup${displayBackups.length !== 1 ? "s" : ""} stored`
                  : "No backups yet"}
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={creating}>
            {creating ? (
              <Spinner className="size-3" />
            ) : (
              <IconPlus aria-hidden={true} />
            )}
            {creating ? "Creating…" : "New backup"}
          </Button>
        </div>
      </CardContent>

      {/* Backup list */}
      <AnimatePresence initial={false}>
        {displayBackups.length > 0 && (
          <CardContent className="border-border/30 border-t pt-4">
            <div className="space-y-1.5">
              {displayBackups.map((backup: BackupInfo) => (
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
                          <IconClock aria-hidden={true} className="size-3.5" />
                        ) : backup.source === "pre-restore" ? (
                          <IconShieldCheck
                            aria-hidden={true}
                            className="size-3.5"
                          />
                        ) : (
                          <IconPointer
                            aria-hidden={true}
                            className="size-3.5"
                          />
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
                        <span className="font-medium text-foreground text-xs">
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
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
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
                                    aria-label="Delete backup"
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
                              onClick={() =>
                                deleteMutation.mutate({
                                  filename: backup.filename,
                                })
                              }
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
