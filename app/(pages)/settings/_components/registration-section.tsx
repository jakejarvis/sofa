"use client";

import { IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
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
  const [toggling, setToggling] = useState(false);

  async function handleToggle(checked: boolean) {
    const previous = registrationOpen;
    setRegistrationOpen(checked);
    setToggling(true);
    try {
      await toggleRegistration(checked);
      toast.success(checked ? "Registration opened" : "Registration closed");
    } catch {
      setRegistrationOpen(previous);
      toast.error("Failed to update registration setting");
    } finally {
      setToggling(false);
    }
  }

  return (
    <CardContent>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <IconUserPlus className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle>Open registration</CardTitle>
            <CardDescription>
              Allow new users to create accounts
            </CardDescription>
          </div>
        </div>
        <Switch
          checked={registrationOpen}
          onCheckedChange={handleToggle}
          disabled={toggling}
        />
      </div>
    </CardContent>
  );
}
