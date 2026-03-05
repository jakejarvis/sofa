"use client";

import { useAtom } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";
import { updateToastShownAtom } from "@/lib/atoms/update-check";

export function UpdateToast() {
  const [shown, setShown] = useAtom(updateToastShownAtom);

  useEffect(() => {
    if (shown) return;

    async function check() {
      try {
        const res = await fetch("/api/admin/update-check");
        if (!res.ok) return;

        const data = (await res.json()) as {
          updateAvailable: boolean;
          currentVersion: string;
          latestVersion: string | null;
          releaseUrl: string | null;
        };

        if (data.updateAvailable) {
          setShown(true);
          toast.info(`Sofa v${data.latestVersion} is available`, {
            description: `You're running v${data.currentVersion}.`,
            duration: 15_000,
            action: data.releaseUrl
              ? {
                  label: "View release",
                  onClick: () =>
                    window.open(data.releaseUrl as string, "_blank"),
                }
              : undefined,
          });
        }
      } catch {
        // Silently ignore network errors
      }
    }

    check();
  }, [shown, setShown]);

  return null;
}
