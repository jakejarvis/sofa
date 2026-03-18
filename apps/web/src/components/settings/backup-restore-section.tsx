import { Trans, useLingui } from "@lingui/react/macro";
import { IconCloudUpload } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/error-messages";
import { orpc } from "@/lib/orpc/client";

export function BackupRestoreSection() {
  const { t } = useLingui();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const restoreMutation = useMutation(
    orpc.admin.backups.restore.mutationOptions({
      onSuccess: () => {
        toast.success(t`Database restored. Reloading...`);
        setTimeout(() => window.location.reload(), 1500);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, t, t`Restore failed`));
      },
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    }),
  );

  function handleRestore(file: File) {
    restoreMutation.mutate(file);
  }

  return (
    <CardContent>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <IconCloudUpload aria-hidden={true} className="text-primary size-4" />
          </div>
          <div>
            <CardTitle>
              <Trans>Restore</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                Upload a .db file to replace the current database. A safety backup is created first.
              </Trans>
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
        <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                <Trans>Restore database?</Trans>
              </AlertDialogTitle>
              <AlertDialogDescription>
                <Trans>
                  This will replace your entire database with the uploaded file. A safety backup of
                  your current data will be created first. Active sessions may need to refresh after
                  restore.
                </Trans>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setRestoreDialogOpen(false);
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <Trans>Cancel</Trans>
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedFile) handleRestore(selectedFile);
                  setRestoreDialogOpen(false);
                  setSelectedFile(null);
                }}
              >
                <Trans>Restore</Trans>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={restoreMutation.isPending}
        >
          {restoreMutation.isPending ? <Spinner /> : <IconCloudUpload aria-hidden={true} />}
          {restoreMutation.isPending ? <Trans>Restoring…</Trans> : <Trans>Upload</Trans>}
        </Button>
      </div>
    </CardContent>
  );
}
