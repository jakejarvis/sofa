"use client";

import { useAtom } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";
import { getUpdateCheckAction } from "@/lib/actions/settings";
import { updateToastShownAtom } from "@/lib/atoms/update-check";

export function UpdateToast() {
  const [shown, setShown] = useAtom(updateToastShownAtom);

  useEffect(() => {
    if (shown) return;

    getUpdateCheckAction().then((data) => {
      if (!data?.updateAvailable) return;

      setShown(true);
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
    });
  }, [shown, setShown]);

  return null;
}
