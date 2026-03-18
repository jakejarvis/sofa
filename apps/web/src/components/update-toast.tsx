import { useLingui } from "@lingui/react/macro";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";

import { updateToastDismissedVersionAtom } from "@/lib/atoms/update-check";
import type { UpdateCheckResult } from "@sofa/api/schemas";

export function UpdateToast({ data }: { data: UpdateCheckResult | null }) {
  const { t } = useLingui();
  const [dismissedVersion, setDismissedVersion] = useAtom(updateToastDismissedVersionAtom);

  useEffect(() => {
    if (!data?.updateAvailable) return;
    if (dismissedVersion === data.latestVersion) return;

    setDismissedVersion(data.latestVersion);
    toast.info(t`Sofa v${data.latestVersion} is available`, {
      description: t`You're running v${data.currentVersion}.`,
      duration: 15_000,
      action: data.releaseUrl
        ? {
            label: t`View release`,
            onClick: () => window.open(data.releaseUrl as string, "_blank"),
          }
        : undefined,
    });
  }, [data, dismissedVersion, setDismissedVersion, t]);

  return null;
}
