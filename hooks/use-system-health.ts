import useSWR from "swr";
import type { SystemHealthData } from "@/lib/services/system-health";
import { fetcher } from "@/lib/swr/fetcher";

export function useSystemHealth() {
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<SystemHealthData>("/api/admin/system-health", fetcher, {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    });

  return {
    data: data ?? null,
    error,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  };
}
