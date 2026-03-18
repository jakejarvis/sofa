import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { invalidateTitleQueries } from "@/lib/title-actions";
import { toast } from "@/lib/toast";

type ToastOverride<TInput> = string | ((input: TInput) => string);

function resolveToast<TInput>(
  override: ToastOverride<TInput> | undefined,
  fallback: string,
  input: TInput,
): string {
  if (!override) return fallback;
  return typeof override === "function" ? override(input) : override;
}

interface UseTitleActionsOptions {
  toasts?: {
    quickAdd?: ToastOverride<{ id: string }>;
    updateStatus?: ToastOverride<{ id: string; status: string | null }>;
    watchMovie?: ToastOverride<{ id: string }>;
    updateRating?: ToastOverride<{ id: string; stars: number }>;
    watchEpisode?: ToastOverride<{ id: string }>;
    unwatchEpisode?: ToastOverride<{ id: string }>;
    watchSeason?: ToastOverride<{ id: string }>;
  };
}

/**
 * Tracked title mutations with loading states.
 * Each returned property is a full UseMutationResult with isPending, mutate, etc.
 */
export function useTitleActions(options?: UseTitleActionsOptions) {
  const t = options?.toasts;

  const quickAdd = useMutation(
    orpc.titles.quickAdd.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(resolveToast(t?.quickAdd, "Added to watchlist", input));
        invalidateTitleQueries();
      },
      onError: () => {
        toast.error("Failed to add to watchlist");
        // Refetch so optimistic local status reverts on failure
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
      },
    }),
  );

  const updateStatus = useMutation(
    orpc.titles.updateStatus.mutationOptions({
      onSuccess: (_data, input) => {
        const statusMessages: Record<string, string> = {
          watchlist: "Added to watchlist",
          in_progress: "Marked as watching",
          completed: "Marked as completed",
        };
        const defaultMsg = input.status
          ? (statusMessages[input.status] ?? "Status updated")
          : "Removed from library";
        toast.success(resolveToast(t?.updateStatus, defaultMsg, input));
        invalidateTitleQueries();
      },
      onError: () => toast.error("Failed to update status"),
    }),
  );

  const watchMovie = useMutation(
    orpc.titles.watchMovie.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(resolveToast(t?.watchMovie, "Marked as watched", input));
        invalidateTitleQueries();
      },
      onError: () => toast.error("Failed to mark as watched"),
    }),
  );

  const updateRating = useMutation(
    orpc.titles.updateRating.mutationOptions({
      onSuccess: (_data, input) => {
        const defaultMsg =
          input.stars > 0
            ? `Rated ${input.stars} star${input.stars > 1 ? "s" : ""}`
            : "Rating removed";
        toast.success(resolveToast(t?.updateRating, defaultMsg, input));
        // Rating only invalidates title queries, not dashboard
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
      },
      onError: () => toast.error("Failed to update rating"),
    }),
  );

  const watchEpisode = useMutation(
    orpc.episodes.watch.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(resolveToast(t?.watchEpisode, "Episode watched", input));
        invalidateTitleQueries();
      },
      onError: () => toast.error("Failed to mark episode"),
    }),
  );

  const unwatchEpisode = useMutation(
    orpc.episodes.unwatch.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(
          resolveToast(t?.unwatchEpisode, "Episode unwatched", input),
        );
        invalidateTitleQueries();
      },
      onError: () => toast.error("Failed to unmark episode"),
    }),
  );

  const watchSeason = useMutation(
    orpc.seasons.watch.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(resolveToast(t?.watchSeason, "Season watched", input));
        invalidateTitleQueries();
      },
      onError: () => toast.error("Failed to mark some episodes"),
    }),
  );

  return {
    quickAdd,
    updateStatus,
    watchMovie,
    updateRating,
    watchEpisode,
    unwatchEpisode,
    watchSeason,
  };
}
