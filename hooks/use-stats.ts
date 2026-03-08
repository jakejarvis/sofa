import useSWR from "swr";
import type { HistoryBucket, TimePeriod } from "@/lib/services/discovery";
import { fetcher } from "@/lib/swr/fetcher";

interface StatsResponse {
  count: number;
  history: HistoryBucket[];
}

export function useStats(type: "movies" | "episodes", period: TimePeriod) {
  const { data } = useSWR<StatsResponse>(
    `/api/stats?type=${type}&period=${period}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  return data;
}
