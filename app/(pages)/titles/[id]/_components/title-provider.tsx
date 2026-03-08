"use client";

import { createStore, Provider } from "jotai";
import { useState } from "react";
import {
  episodeWatchesAtom,
  seasonsAtom,
  titleIdAtom,
  titleNameAtom,
  titleTypeAtom,
  userRatingAtom,
  userStatusAtom,
} from "@/lib/atoms/title";
import type { Season } from "@/lib/types";

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
  const [store] = useState(() => {
    const s = createStore();
    s.set(titleIdAtom, titleId);
    s.set(titleTypeAtom, titleType);
    s.set(titleNameAtom, titleName);
    s.set(seasonsAtom, seasons);
    s.set(userStatusAtom, initialStatus);
    s.set(userRatingAtom, initialRating);
    s.set(episodeWatchesAtom, initialEpisodeWatches);
    return s;
  });

  return <Provider store={store}>{children}</Provider>;
}
