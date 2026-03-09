"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Season } from "@/lib/orpc/schemas";
import { orpc } from "@/lib/orpc/tanstack";
import { TitleContext } from "./title-context";

export function TitleProvider({
  titleId,
  titleType,
  titleName,
  initialStatus,
  initialRating,
  initialEpisodeWatches,
  seasons: initialSeasons,
  children,
}: {
  titleId: string;
  titleType: "movie" | "tv";
  titleName: string;
  initialStatus: string | null;
  initialRating: number;
  initialEpisodeWatches: string[];
  seasons: Season[];
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [seasons, setSeasons] = useState(initialSeasons);
  const [watchingEp, setWatchingEp] = useState<string | null>(null);

  // Always overwrite the cache with fresh server-fetched data on mount.
  // Unlike initialData (which is a no-op when the cache already has an entry),
  // this ensures revisiting a title or signing into a different account never
  // renders stale or another user's data.
  useState(() => {
    queryClient.setQueryData(
      orpc.titles.userInfo.queryKey({ input: { id: titleId } }),
      {
        status: initialStatus as
          | "watchlist"
          | "in_progress"
          | "completed"
          | null,
        rating: initialRating,
        episodeWatches: initialEpisodeWatches,
      },
    );
  });

  return (
    <TitleContext
      value={{
        titleId,
        titleType,
        titleName,
        seasons,
        setSeasons,
        watchingEp,
        setWatchingEp,
      }}
    >
      {children}
    </TitleContext>
  );
}
