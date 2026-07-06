import { Trans } from "@lingui/react/macro";
import { IconCheck, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { StarRating } from "./star-rating";
import { StatusButton } from "./status-button";
import { useTitleContext, useTitleUserInfo } from "./title-context";
import { useTitleActions } from "./use-title-actions";

export function TitleActions() {
  const { titleType } = useTitleContext();
  const { userStatus, userRating } = useTitleUserInfo();
  const { handleStatusChange, handleRating, handleWatchMovie, handleUnwatchMovie } =
    useTitleActions();
  const isMovieWatched = userStatus === "completed";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusButton currentStatus={userStatus ?? null} onChange={handleStatusChange} />
      {titleType === "movie" && (
        <Button
          onClick={isMovieWatched ? handleUnwatchMovie : handleWatchMovie}
          variant={isMovieWatched ? "destructive" : "default"}
          size="lg"
          className={`h-9 rounded-lg px-4 text-sm hover:shadow-md active:scale-[0.97] ${isMovieWatched ? "hover:shadow-destructive/20" : "hover:shadow-primary/20"}`}
        >
          {isMovieWatched ? (
            <>
              <IconX aria-hidden={true} className="size-3.5" />
              <Trans>Mark Unwatched</Trans>
            </>
          ) : (
            <>
              <IconCheck aria-hidden={true} className="size-3.5" />
              <Trans>Mark Watched</Trans>
            </>
          )}
        </Button>
      )}
      <Separator orientation="vertical" className="bg-border/50 mx-0.5 my-auto h-6" />
      <StarRating value={userRating ?? 0} onChange={handleRating} />
    </div>
  );
}
