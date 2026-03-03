"use client";

import { IconChecks, IconPlayerPlay } from "@tabler/icons-react";
import { useState } from "react";
import { StarRating } from "@/components/star-rating";
import { StatusButton } from "@/components/status-button";
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
import { useTitleInteraction } from "./title-interaction-provider";

export function TitleActions() {
  const {
    titleType,
    userStatus,
    userRating,
    handleStatusChange,
    handleRating,
    handleWatchMovie,
    handleMarkAllWatched,
  } = useTitleInteraction();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusButton
        currentStatus={userStatus ?? null}
        onChange={handleStatusChange}
      />
      {titleType === "movie" && (
        <button
          type="button"
          onClick={handleWatchMovie}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all active:scale-[0.97] hover:shadow-md hover:shadow-primary/20"
        >
          <IconPlayerPlay size={14} />
          Mark Watched
        </button>
      )}
      {titleType === "tv" && userStatus && userStatus !== "completed" && (
        <MarkAllWatchedButton onConfirm={handleMarkAllWatched} />
      )}
      <span className="mx-0.5 h-4 w-px bg-border/50" />
      <StarRating value={userRating ?? 0} onChange={handleRating} />
    </div>
  );
}

function MarkAllWatchedButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-[0.97]"
          >
            <IconChecks size={14} />
            Mark All Watched
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark all episodes as watched?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark every episode of this show as watched. You can undo
            this later by unmarking individual seasons.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Mark All Watched
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
