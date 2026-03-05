"use client";

import { IconCloudDownload } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toggleUpdateCheck } from "@/lib/actions/settings";

export function UpdateCheckSection({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [toggling, setToggling] = useState(false);

  async function handleToggle(checked: boolean) {
    const previous = enabled;
    setEnabled(checked);
    setToggling(true);
    try {
      await toggleUpdateCheck(checked);
      toast.success(
        checked ? "Update checks enabled" : "Update checks disabled",
      );
    } catch {
      setEnabled(previous);
      toast.error("Failed to update setting");
    } finally {
      setToggling(false);
    }
  }

  return (
    <CardContent>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <IconCloudDownload className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle>Automatic update checks</CardTitle>
            <CardDescription>
              Periodically check GitHub for new Sofa releases
            </CardDescription>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={toggling}
        />
      </div>
    </CardContent>
  );
}
