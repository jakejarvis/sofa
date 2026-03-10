"use client";

import { IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "./star-rating";
import { StatusButton } from "./status-button";
import { useTitleContext, useTitleUserInfo } from "./title-context";
import { useTitleActions } from "./use-title-actions";

export function TitleActions() {
  const { titleType } = useTitleContext();
  const { userStatus, userRating } = useTitleUserInfo();
  const { handleStatusChange, handleRating, handleWatchMovie } =
    useTitleActions();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusButton
        currentStatus={userStatus ?? null}
        onChange={handleStatusChange}
      />
      {titleType === "movie" && (
        <Button
          onClick={handleWatchMovie}
          size="lg"
          className="h-9 rounded-lg px-4 text-sm hover:shadow-md hover:shadow-primary/20 active:scale-[0.97]"
        >
          <IconCheck aria-hidden={true} className="size-3.5" />
          Mark Watched
        </Button>
      )}
      <Separator
        orientation="vertical"
        className="mx-0.5 my-auto h-6 bg-border/50"
      />
      <StarRating value={userRating ?? 0} onChange={handleRating} />
    </div>
  );
}
