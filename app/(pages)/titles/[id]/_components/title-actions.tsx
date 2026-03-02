"use client";

import { IconPlayerPlay } from "@tabler/icons-react";
import { StarRating } from "@/components/star-rating";
import { StatusButton } from "@/components/status-button";
import { useTitleInteraction } from "./title-interaction-provider";

export function TitleActions() {
  const {
    titleType,
    userStatus,
    userRating,
    handleStatusChange,
    handleRating,
    handleWatchMovie,
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
          <IconPlayerPlay size={15} />
          Mark Watched
        </button>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rate:</span>
        <StarRating value={userRating ?? 0} onChange={handleRating} />
      </div>
    </div>
  );
}
