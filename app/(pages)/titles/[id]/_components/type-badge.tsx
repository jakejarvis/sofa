"use client";

import { IconDeviceTv, IconMovie } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TypeBadge({ type }: { type: "movie" | "tv" }) {
  const isMovie = type === "movie";

  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-default items-center justify-center rounded bg-primary/10 p-1 text-primary">
        {isMovie ? (
          <IconMovie aria-hidden className="size-3.5" />
        ) : (
          <IconDeviceTv aria-hidden className="size-3.5" />
        )}
      </TooltipTrigger>
      <TooltipContent>{isMovie ? "Movie" : "TV Series"}</TooltipContent>
    </Tooltip>
  );
}
