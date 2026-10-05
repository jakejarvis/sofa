import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/error-messages";
import { runImportJob } from "@/lib/import-job";
import type { ImportOptions, ImportProgress, ImportResult } from "@/lib/import-job";
import { client } from "@/lib/orpc/client";
import { invalidateTrackingQueries } from "@/lib/orpc/invalidate";
import type { NormalizedImport } from "@sofa/api/schemas";

export type ImportJobStartResult = "done" | "detached" | "failed" | "aborted";

export function useImportJob({
  successMessage,
  onDetached,
}: {
  /** Toast text for a finished import with N > 0 imported items. */
  successMessage: (importedCount: number) => string;
  /** Called when the job continues in the background or the connection is lost (close the dialog). */
  onDetached: () => void;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function start(input: {
    data: NormalizedImport;
    options: ImportOptions;
  }): Promise<ImportJobStartResult> {
    setProgress(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const outcome = await runImportJob(client.imports, input, controller.signal, setProgress);
      switch (outcome.kind) {
        case "done":
          setResult(outcome.result);
          void invalidateTrackingQueries(queryClient);
          if (outcome.result.imported > 0) {
            toast.success(successMessage(outcome.result.imported));
          }
          return "done";
        case "background":
          toast.info(t`Import is still running in the background. Check back later.`);
          onDetached();
          return "detached";
        case "lost":
          toast.error(t`Lost connection to import. Check status in settings.`);
          onDetached();
          return "detached";
        case "aborted":
          return "aborted";
      }
    } catch (err) {
      if (controller.signal.aborted) return "aborted";
      toast.error(getErrorMessage(err, t`Import failed`));
      return "failed";
    } finally {
      abortRef.current = null;
    }
  }

  function abort() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function reset() {
    setProgress(null);
    setResult(null);
  }

  return { progress, result, start, abort, reset };
}
