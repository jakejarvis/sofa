import { Trans } from "@lingui/react/macro";
import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  function handleRefresh() {
    setIsRefreshing(true);
    window.location.reload();
  }

  return (
    <Button
      size="lg"
      className="hover:shadow-primary/20 h-9 rounded-lg px-4 text-sm hover:shadow-md"
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      {isRefreshing ? <Spinner /> : <IconRefresh aria-hidden={true} className="size-3.5" />}
      {isRefreshing ? <Trans>Checking…</Trans> : <Trans>Check configuration</Trans>}
    </Button>
  );
}
