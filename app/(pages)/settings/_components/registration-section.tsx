"use client";

import { IconDoorEnter } from "@tabler/icons-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toggleRegistration } from "@/lib/actions/settings";

export function RegistrationSection({
  initialRegistrationOpen,
}: {
  initialRegistrationOpen: boolean;
}) {
  const [registrationOpen, setRegistrationOpen] = useState(
    initialRegistrationOpen,
  );
  const [optimisticOpen, setOptimisticOpen] = useOptimistic(registrationOpen);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      setOptimisticOpen(checked);
      try {
        await toggleRegistration(checked);
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
