import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
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

interface WatchInput {
  scope: string;
  ids: string[];
}

interface UseTitleActionsOptions {
  toasts?: {
    quickAdd?: ToastOverride<{ id: string }>;
    updateStatus?: ToastOverride<{ id: string; status: string | null }>;
    watchMovie?: ToastOverride<WatchInput>;
    updateRating?: ToastOverride<{ id: string; stars: number }>;
    watchEpisode?: ToastOverride<WatchInput>;
    unwatchEpisode?: ToastOverride<WatchInput>;
    watchSeason?: ToastOverride<WatchInput>;
  };
}

/**
 * Tracked title mutations with loading states.
 * Each returned property is a full UseMutationResult with isPending, mutate, etc.
 */
export function useTitleActions(options?: UseTitleActionsOptions) {
  const { t } = useLingui();
  const toastOverrides = options?.toasts;

  const quickAdd = useMutation(
    orpc.tracking.quickAdd.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(resolveToast(toastOverrides?.quickAdd, t`Added to watchlist`, input));
        invalidateTitleQueries();
      },
      onError: () => {
        toast.error(t`Failed to add to watchlist`);
        // Refetch so optimistic local status reverts on failure
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
      },
    }),
  );

  const updateStatus = useMutation(
    orpc.tracking.updateStatus.mutationOptions({
      onSuccess: (_data, input) => {
        const statusMessages: Record<string, string> = {
          watchlist: t`Added to watchlist`,
        };
        const defaultMsg = input.status
          ? (statusMessages[input.status] ?? t`Status updated`)
          : t`Removed from library`;
        toast.success(resolveToast(toastOverrides?.updateStatus, defaultMsg, input));
        invalidateTitleQueries();
      },
      onError: () => toast.error(t`Failed to update status`),
    }),
  );

  const watchMovie = useMutation(
    orpc.tracking.watch.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(resolveToast(toastOverrides?.watchMovie, t`Marked as watched`, input));
        invalidateTitleQueries();
      },
      onError: () => toast.error(t`Failed to mark as watched`),
    }),
  );

  const updateRating = useMutation(
    orpc.tracking.rate.mutationOptions({
      onSuccess: (_data, input) => {
        const stars = input.stars;
        const defaultMsg =
          stars > 0
            ? t`Rated ${plural(stars, { one: "# star", other: "# stars" })}`
            : t`Rating removed`;
        toast.success(resolveToast(toastOverrides?.updateRating, defaultMsg, input));
        // Rating only invalidates title queries, not tracking
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
      },
      onError: () => toast.error(t`Failed to update rating`),
    }),
  );

  const watchEpisode = useMutation(
    orpc.tracking.watch.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(resolveToast(toastOverrides?.watchEpisode, t`Episode watched`, input));
        invalidateTitleQueries();
      },
      onError: () => toast.error(t`Failed to mark episode`),
    }),
  );

  const unwatchEpisode = useMutation(
    orpc.tracking.unwatch.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(resolveToast(toastOverrides?.unwatchEpisode, t`Episode unwatched`, input));
        invalidateTitleQueries();
      },
      onError: () => toast.error(t`Failed to unmark episode`),
    }),
  );

  const watchSeason = useMutation(
    orpc.tracking.watch.mutationOptions({
      onSuccess: (_data, input) => {
        toast.success(resolveToast(toastOverrides?.watchSeason, t`Season watched`, input));
        invalidateTitleQueries();
      },
      onError: () => toast.error(t`Failed to mark some episodes`),
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
