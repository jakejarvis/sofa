import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/error-messages";
import { orpc } from "@/lib/orpc/client";
import { invalidateTrackingQueries } from "@/lib/orpc/invalidate";

/** Mark a single episode watched from a dashboard card, with toast + cache refresh. */
export function useQuickWatchEpisode() {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  // Handlers live on the hook-level options so the mutation stays pending until
  // the tracking queries have refetched, which blocks duplicate clicks.
  const { mutate, variables, isPending } = useMutation(
    orpc.tracking.watch.mutationOptions({
      onSuccess: async () => {
        toast.success(t`Marked ${label} as watched`);
        await invalidateTrackingQueries(queryClient);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, t`Failed to mark episode`));
      },
    }),
  );

  function watchEpisode(episodeId: string, episodeLabel: string) {
    if (isPending) return;
    setLabel(episodeLabel);
    mutate({ scope: "episode", ids: [episodeId] });
  }

  const pendingId = isPending ? (variables?.ids?.[0] ?? null) : null;

  return { watchEpisode, pendingId };
}
