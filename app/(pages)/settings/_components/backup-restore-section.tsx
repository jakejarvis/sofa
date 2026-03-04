"use client";

import { IconCloudUpload } from "@tabler/icons-react";
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

export function BackupRestoreSection() {
  const [restoring, setRestoring] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <CardContent>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <IconCloudUpload className="size-4 text-primary" />
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
          disabled={restoring}
        >
          {restoring ? <Spinner /> : <IconCloudUpload />}
          {restoring ? "Restoring..." : "Upload"}
        </Button>
      </div>
    </CardContent>
  );
}
