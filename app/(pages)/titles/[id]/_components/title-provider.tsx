"use client";

import { useHydrateAtoms } from "jotai/utils";
import {
  episodeWatchesAtom,
  seasonsAtom,
  titleIdAtom,
  titleNameAtom,
  titleTypeAtom,
  userRatingAtom,
  userStatusAtom,
} from "@/lib/atoms/title";
import type { Season } from "@/lib/types/title";

export function TitleProvider({
  titleId,
  titleType,
  titleName,
  initialStatus,
  initialRating,
  initialEpisodeWatches,
  seasons,
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
  useHydrateAtoms([
    [titleIdAtom, titleId],
    [titleTypeAtom, titleType],
    [titleNameAtom, titleName],
    [seasonsAtom, seasons],
    [userStatusAtom, initialStatus],
    [userRatingAtom, initialRating],
    [episodeWatchesAtom, initialEpisodeWatches],
  ]);

  return children;
}
