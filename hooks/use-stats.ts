import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { HistoryBucket, TimePeriod } from "@/lib/services/discovery";

interface StatsResponse {
  count: number;
  history: HistoryBucket[];
}

export function useStats(type: "movies" | "episodes", period: TimePeriod) {
  const { data } = useQuery<StatsResponse>({
    queryKey: ["stats", type, period],
    queryFn: () => api<StatsResponse>(`/stats?type=${type}&period=${period}`),
  });

  return data;
}
