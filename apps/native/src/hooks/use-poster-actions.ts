import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";

/**
 * Provides shared press/quickAdd handlers for PosterCard lists.
 * Use once per list parent instead of per-card to avoid creating
 * a mutation observer for every mounted PosterCard.
 */
export function usePosterActions() {
  const { navigate } = useRouter();

  const resolveMutation = useMutation(
    orpc.titles.resolve.mutationOptions({
      onSuccess: ({ id }) => {
        if (id) navigate(`/title/${id}`);
      },
      onError: () => toast.error("Failed to load title"),
    }),
  );

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

  const handlePress = useCallback(
    (id: string | undefined, tmdbId: number, type: "movie" | "tv") => {
      if (id) {
        navigate(`/title/${id}`);
      } else {
        resolveMutation.mutate({ tmdbId, type });
      }
    },
    [navigate, resolveMutation.mutate],
  );

  const handleQuickAdd = useCallback(
    (tmdbId: number, type: "movie" | "tv") => {
      quickAddMutation.mutate({ tmdbId, type });
    },
    [quickAddMutation.mutate],
  );

  const addingKey =
    quickAddMutation.isPending && quickAddMutation.variables
      ? `${quickAddMutation.variables.tmdbId}-${quickAddMutation.variables.type}`
      : null;

  return { handlePress, handleQuickAdd, addingKey };
}
