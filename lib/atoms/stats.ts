import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import { getStatsAction } from "@/lib/actions/watchlist";
import type { TimePeriod } from "@/lib/services/discovery";

export const moviePeriodAtom = atom<TimePeriod>("this_month");
export const episodePeriodAtom = atom<TimePeriod>("this_week");

const movieStatsAsyncAtom = atom(async (get) => {
  const period = get(moviePeriodAtom);
  return getStatsAction("movies", period);
});

const episodeStatsAsyncAtom = atom(async (get) => {
  const period = get(episodePeriodAtom);
  return getStatsAction("episodes", period);
});

export const movieStatsAtom = unwrap(movieStatsAsyncAtom);
export const episodeStatsAtom = unwrap(episodeStatsAsyncAtom);
