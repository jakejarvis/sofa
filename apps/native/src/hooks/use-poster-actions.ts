import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";

/**
 * Provides shared quickAdd handlers for PosterCard lists.
 * Use once per list parent instead of per-card to avoid creating
 * a mutation observer for every mounted PosterCard.
 */
export function usePosterActions() {
  const quickAddMutation = useMutation(
    orpc.titles.quickAdd.mutationOptions({
      onSuccess: () => {
        toast.success("Added to watchlist");
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => {
        toast.error("Failed to add to watchlist");
        // Refetch so optimistic local status reverts on failure
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
      },
    }),
  );

  const handleQuickAdd = useCallback(
    (id: string) => {
      quickAddMutation.mutate({ id });
    },
    [quickAddMutation.mutate],
  );

  const addingKey =
    quickAddMutation.isPending && quickAddMutation.variables
      ? quickAddMutation.variables.id
      : null;

  const failedKey =
    quickAddMutation.isError && quickAddMutation.variables
      ? quickAddMutation.variables.id
      : null;

  const resetError = useCallback(() => {
    quickAddMutation.reset();
  }, [quickAddMutation.reset]);

  return { handleQuickAdd, addingKey, failedKey, resetError };
}
