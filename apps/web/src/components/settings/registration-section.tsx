import { IconDoorEnter } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { orpc } from "@/lib/orpc/client";

export function RegistrationSection() {
  const { data, isPending: isLoading } = useQuery(
    orpc.admin.registration.queryOptions(),
  );
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(
    null,
  );
  const currentOpen = registrationOpen ?? data?.open ?? false;
  const [optimisticOpen, setOptimisticOpen] = useOptimistic(currentOpen);
  const [isPending, startTransition] = useTransition();
  const toggleMutation = useMutation(
    orpc.admin.toggleRegistration.mutationOptions(),
  );

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
        await toggleMutation.mutateAsync({ open: checked });
        setRegistrationOpen(checked);
        toast.success(checked ? "Registration opened" : "Registration closed");
      } catch {
        toast.error("Failed to update registration setting");
      }
    });
  }

  return (
    <CardContent>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <IconDoorEnter aria-hidden={true} className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle>Open registration</CardTitle>
            <CardDescription>
              Allow new users to create accounts
            </CardDescription>
          </div>
        </div>
        <Switch
          checked={optimisticOpen}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label="Toggle open registration"
        />
      </div>
    </CardContent>
  );
}
