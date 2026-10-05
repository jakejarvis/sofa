import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/error-messages";
import { orpc } from "@/lib/orpc/client";
import { invalidateTrackingQueries } from "@/lib/orpc/invalidate";

/** Mark a single episode watched from a dashboard card, with toast + cache refresh. */
export function useQuickWatchEpisode() {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const { mutate, variables, isPending } = useMutation(orpc.tracking.watch.mutationOptions());

  function watchEpisode(episodeId: string, label: string) {
    mutate(
      { scope: "episode", ids: [episodeId] },
      {
        onSuccess: () => {
          toast.success(t`Marked ${label} as watched`);
          void invalidateTrackingQueries(queryClient);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, t`Failed to mark episode`));
        },
      },
    );
  }

  const pendingId = isPending ? (variables?.ids?.[0] ?? null) : null;

  return { watchEpisode, pendingId };
}
