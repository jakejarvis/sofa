import { Trans, useLingui } from "@lingui/react/macro";
import { IconWorldUpload } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { orpc } from "@/lib/orpc/client";

export function UpdateCheckSection() {
  const { t } = useLingui();
  const { data, isPending: isLoading } = useQuery(orpc.admin.updateCheck.queryOptions());
  const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);
  const currentEnabled = localEnabled ?? data?.enabled ?? true;
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(currentEnabled);
  const [isPending, startTransition] = useTransition();
  const toggleMutation = useMutation(orpc.admin.toggleUpdateCheck.mutationOptions());

  if (isLoading) {
    return (
      <CardContent>
        <Skeleton className="h-12 w-full" />
      </CardContent>
    );
  }

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      setOptimisticEnabled(checked);
      try {
        await toggleMutation.mutateAsync({ enabled: checked });
        setLocalEnabled(checked);
        toast.success(checked ? t`Update checks enabled` : t`Update checks disabled`);
      } catch {
        toast.error(t`Failed to update setting`);
      }
    });
  }

  return (
    <CardContent>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <IconWorldUpload aria-hidden={true} className="text-primary size-4" />
          </div>
          <div>
            <CardTitle>
              <Trans>Automatic update checks</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Periodically check GitHub for new Sofa releases</Trans>
            </CardDescription>
          </div>
        </div>
        <Switch
          checked={optimisticEnabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label={t`Toggle automatic update checks`}
        />
      </div>
    </CardContent>
  );
}
