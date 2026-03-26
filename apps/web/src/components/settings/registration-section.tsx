import { Trans, useLingui } from "@lingui/react/macro";
import { IconDoorEnter } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { orpc } from "@/lib/orpc/client";

export function RegistrationSection() {
  const { t } = useLingui();
  const { data, isPending: isLoading } = useQuery(orpc.admin.settings.get.queryOptions());
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const currentOpen = registrationOpen ?? data?.registration.open ?? false;
  const [optimisticOpen, setOptimisticOpen] = useOptimistic(currentOpen);
  const [isPending, startTransition] = useTransition();
  const toggleMutation = useMutation(orpc.admin.settings.update.mutationOptions());

  if (isLoading) {
    return (
      <CardContent>
        <Skeleton className="h-12 w-full" />
      </CardContent>
    );
  }

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      setOptimisticOpen(checked);
      try {
        await toggleMutation.mutateAsync({ registration: { open: checked } });
        setRegistrationOpen(checked);
        toast.success(checked ? t`Registration opened` : t`Registration closed`);
      } catch {
        toast.error(t`Failed to update registration setting`);
      }
    });
  }

  return (
    <CardContent>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <IconDoorEnter aria-hidden={true} className="text-primary size-4" />
          </div>
          <div>
            <CardTitle>
              <Trans>Open registration</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Allow new users to create accounts</Trans>
            </CardDescription>
          </div>
        </div>
        <Switch
          checked={optimisticOpen}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label={t`Toggle open registration`}
        />
      </div>
    </CardContent>
  );
}
