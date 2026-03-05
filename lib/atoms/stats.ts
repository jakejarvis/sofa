import { atom } from "jotai";
import { loadable } from "jotai/utils";
import type { HistoryBucket, TimePeriod } from "@/lib/services/discovery";

export const moviePeriodAtom = atom<TimePeriod>("this_month");
export const episodePeriodAtom = atom<TimePeriod>("this_week");

async function fetchStats(
  type: "movies" | "episodes",
  period: TimePeriod,
): Promise<{ count: number; history: HistoryBucket[] }> {
  const res = await fetch(
    `/api/stats?type=${type}&period=${period}&history=true`,
  );
  return res.json();
}

const movieStatsAsyncAtom = atom(async (get) => {
  const period = get(moviePeriodAtom);
  return fetchStats("movies", period);
});

const episodeStatsAsyncAtom = atom(async (get) => {
  const period = get(episodePeriodAtom);
  return fetchStats("episodes", period);
});

export const movieStatsLoadable = loadable(movieStatsAsyncAtom);
export const episodeStatsLoadable = loadable(episodeStatsAsyncAtom);
