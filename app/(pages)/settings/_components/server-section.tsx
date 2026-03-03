"use client";

import { IconShieldLock, IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toggleRegistration } from "./actions";

export function ServerSection({
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
    } catch {
      setRegistrationOpen(previous);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <IconShieldLock size={16} className="text-muted-foreground" />
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Server
        </h2>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          Admin
        </span>
      </div>
      <Card className="border-l-2 border-l-primary/30">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <IconUserPlus size={16} className="text-primary" />
              </div>
              <div>
                <CardTitle>Open registration</CardTitle>
                <CardDescription>
                  Allow new users to create accounts. Useful for adding
                  household members.
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
      </Card>
    </div>
  );
}
