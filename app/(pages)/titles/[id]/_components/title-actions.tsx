"use client";

import { IconCheck } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import {
  titleTypeAtom,
  userRatingAtom,
  userStatusAtom,
} from "@/lib/atoms/title";
import { StarRating } from "./star-rating";
import { StatusButton } from "./status-button";
import { useTitleActions } from "./use-title-actions";

export function TitleActions() {
  const titleType = useAtomValue(titleTypeAtom);
  const userStatus = useAtomValue(userStatusAtom);
  const userRating = useAtomValue(userRatingAtom);
  const { handleStatusChange, handleRating, handleWatchMovie } =
    useTitleActions();

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
          <IconCheck aria-hidden={true} className="size-3.5" />
          Mark Watched
        </button>
      )}
      <span className="mx-0.5 h-4 w-px bg-border/50" />
      <StarRating value={userRating ?? 0} onChange={handleRating} />
    </div>
  );
}
