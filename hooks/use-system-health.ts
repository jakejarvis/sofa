import useSWR from "swr";
import type { SystemHealthData } from "@/lib/services/system-health";
import { fetcher } from "@/lib/swr/fetcher";

interface StatusResponse {
  tmdbConfigured: boolean;
  health: SystemHealthData;
}

export function useSystemHealth(initialData: SystemHealthData) {
  const { data, isValidating, mutate } = useSWR<StatusResponse>(
    "/api/status",
    fetcher,
    {
      revalidateOnFocus: false,
      fallbackData: { tmdbConfigured: true, health: initialData },
    },
  );

  return {
    data: data?.health ?? initialData,
    isRefreshing: isValidating,
    refresh: () => mutate(),
  };
}
