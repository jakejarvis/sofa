import { useLingui } from "@lingui/react/macro";
import { IconLoader } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const { t } = useLingui();
  return (
    <IconLoader
      role="status"
      aria-label={t`Loading`}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
