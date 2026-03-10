"use client";

import { useAtom } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";
import { updateToastDismissedVersionAtom } from "@/lib/atoms/update-check";
import type { UpdateCheckResult } from "@/lib/services/update-check";

export function UpdateToast({ data }: { data: UpdateCheckResult | null }) {
  const [dismissedVersion, setDismissedVersion] = useAtom(
    updateToastDismissedVersionAtom,
  );

  useEffect(() => {
    if (!data?.updateAvailable) return;
    if (dismissedVersion === data.latestVersion) return;

    setDismissedVersion(data.latestVersion);
    toast.info(`Sofa v${data.latestVersion} is available`, {
      description: `You're running v${data.currentVersion}.`,
      duration: 15_000,
      action: data.releaseUrl
        ? {
            label: "View release",
            onClick: () => window.open(data.releaseUrl as string, "_blank"),
          }
        : undefined,
    });
  }, [data, dismissedVersion, setDismissedVersion]);

  return null;
}
