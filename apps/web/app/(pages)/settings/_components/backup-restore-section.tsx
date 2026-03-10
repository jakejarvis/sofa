"use client";

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
import { orpc } from "@/lib/orpc/tanstack";

export function BackupRestoreSection() {
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const restoreMutation = useMutation(
    orpc.admin.backups.restore.mutationOptions({
      onSuccess: () => {
        toast.success("Database restored. Reloading...");
        setTimeout(() => window.location.reload(), 1500);
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : "Restore failed";
        toast.error(message);
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
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <IconCloudUpload
              aria-hidden={true}
              className="size-4 text-primary"
            />
          </div>
          <div>
            <CardTitle>Restore</CardTitle>
            <CardDescription>
              Upload a .db file to replace the current database. A safety backup
              is created first.
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
        <AlertDialog
          open={restoreDialogOpen}
          onOpenChange={setRestoreDialogOpen}
        >
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
              <AlertDialogCancel
                onClick={() => {
                  setRestoreDialogOpen(false);
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedFile) handleRestore(selectedFile);
                  setRestoreDialogOpen(false);
                  setSelectedFile(null);
                }}
              >
                Restore
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={restoreMutation.isPending}
        >
          {restoreMutation.isPending ? (
            <Spinner />
          ) : (
            <IconCloudUpload aria-hidden={true} />
          )}
          {restoreMutation.isPending ? "Restoring…" : "Upload"}
        </Button>
      </div>
    </CardContent>
  );
}
