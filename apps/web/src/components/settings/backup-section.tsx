import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { orpc } from "@/lib/orpc/client";
import type { BackupInfo } from "@sofa/api/schemas";
import { formatBytes as formatBytesI18n, formatDate, formatRelativeTime } from "@sofa/i18n/format";

function formatBackupDate(dateStr: string): string {
  return formatDate(dateStr, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BackupSection() {
  const { t } = useLingui();
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
        toast.success(t`Backup created`, {
          action: {
            label: t`Download`,
            onClick: () => {
              const a = document.createElement("a");
              a.href = `/api/backup/${backup.filename}`;
              a.download = backup.filename;
              a.click();
            },
          },
        });
      },
      onError: () => toast.error(t`Failed to create backup`),
    }),
  );

  const deleteMutation = useMutation(
    orpc.admin.backups.delete.mutationOptions({
      onMutate: ({ filename }) => {
        const previous = displayBackups;
        setBackups(displayBackups.filter((b: BackupInfo) => b.filename !== filename));
        return { previous };
      },
      onSuccess: () => toast.success(t`Backup deleted`),
      onError: (_, __, ctx) => {
        if (ctx?.previous) setBackups(ctx.previous);
        toast.error(t`Failed to delete backup`);
      },
    }),
  );

  const creating = createMutation.isPending;
  const deleting = deleteMutation.isPending ? (deleteMutation.variables?.filename ?? null) : null;

  const backupCountLabel =
    displayBackups.length > 0
      ? t`${displayBackups.length} ${plural(displayBackups.length, { one: "backup", other: "backups" })} stored`
      : t`No backups yet`;

  return (
    <>
      {/* Header */}
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <IconDatabaseExport aria-hidden={true} className="text-primary size-4" />
            </div>
            <div>
              <CardTitle>
                <Trans>Database backups</Trans>
              </CardTitle>
              <CardDescription>{backupCountLabel}</CardDescription>
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={creating}>
            {creating ? <Spinner className="size-3" /> : <IconPlus aria-hidden={true} />}
            {creating ? <Trans>Creating…</Trans> : <Trans>New backup</Trans>}
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
                  <div className="group hover:bg-muted/40 flex items-center gap-3 rounded-md px-2.5 py-1.5 transition-colors">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="text-muted-foreground flex shrink-0 items-center" />
                        }
                      >
                        {backup.source === "scheduled" ? (
                          <IconClock aria-hidden={true} className="size-3.5" />
                        ) : backup.source === "pre-restore" ? (
                          <IconShieldCheck aria-hidden={true} className="size-3.5" />
                        ) : (
                          <IconPointer aria-hidden={true} className="size-3.5" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        {backup.source === "scheduled"
                          ? t`Scheduled backup`
                          : backup.source === "pre-restore"
                            ? t`Pre-restore backup`
                            : t`Manual backup`}
                      </TooltipContent>
                    </Tooltip>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-foreground text-xs font-medium">
                          {formatBackupDate(backup.createdAt)}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {formatBytesI18n(backup.sizeBytes)}
                        </span>
                        <span
                          className="text-muted-foreground/50 text-[11px]"
                          suppressHydrationWarning
                        >
                          {formatRelativeTime(backup.createdAt)}
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
                                  aria-label={t`Download backup`}
                                >
                                  <IconCloudDownload />
                                </a>
                              }
                            />
                          }
                        />
                        <TooltipContent>
                          <Trans>Download</Trans>
                        </TooltipContent>
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
                                    aria-label={t`Delete backup`}
                                    className="text-muted-foreground hover:text-destructive"
                                    disabled={deleting === backup.filename}
                                  />
                                }
                              />
                            }
                          >
                            {deleting === backup.filename ? <Spinner /> : <IconTrash />}
                          </AlertDialogTrigger>
                          <TooltipContent>
                            <Trans>Delete</Trans>
                          </TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              <Trans>Delete backup?</Trans>
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              <Trans>
                                This will permanently delete the backup from{" "}
                                <strong>{formatBackupDate(backup.createdAt)}</strong>. This cannot
                                be undone.
                              </Trans>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              <Trans>Cancel</Trans>
                            </AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() =>
                                deleteMutation.mutate({
                                  filename: backup.filename,
                                })
                              }
                            >
                              <Trans>Delete</Trans>
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
