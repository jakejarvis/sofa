import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/error-messages";
import { orpc } from "@/lib/orpc/client";
import { invalidateTrackingQueries } from "@/lib/orpc/invalidate";

/** Remove a single watch from history, with toast + cache refresh. */
export function useDeleteWatch() {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  // Handlers live on the hook-level options so the mutation stays pending until
  // the tracking queries have refetched, which blocks duplicate clicks.
  const { mutate, variables, isPending } = useMutation(
    orpc.tracking.deleteWatch.mutationOptions({
      onSuccess: async () => {
        toast.success(t`Removed from history`);
        await invalidateTrackingQueries(queryClient);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, t`Failed to remove from history`));
      },
    }),
  );

  function deleteWatch(kind: "movie" | "episode", watchId: string) {
    if (isPending) return;
    mutate({ kind, watchId });
  }

  const pendingId = isPending ? (variables?.watchId ?? null) : null;

  return { deleteWatch, pendingId };
}
