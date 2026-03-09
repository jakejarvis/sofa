import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { SystemHealthData } from "@/lib/services/system-health";

interface StatusResponse {
  tmdbConfigured: boolean;
  health: SystemHealthData;
}

export function useSystemHealth(initialData?: SystemHealthData) {
  const queryClient = useQueryClient();
  const { data, isFetching, isPending } = useQuery<StatusResponse>({
    queryKey: ["system-health"],
    queryFn: () => api<StatusResponse>("/status"),
    ...(initialData
      ? { initialData: { tmdbConfigured: true, health: initialData } }
      : {}),
  });

  return {
    data: data?.health ?? initialData ?? null,
    isPending: isPending && !initialData,
    isRefreshing: isFetching,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: ["system-health"] }),
  };
}
