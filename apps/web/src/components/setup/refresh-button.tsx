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
      className="h-9 rounded-lg px-4 text-sm hover:shadow-md hover:shadow-primary/20"
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      {isRefreshing ? (
        <Spinner />
      ) : (
        <IconRefresh aria-hidden={true} className="size-3.5" />
      )}
      {isRefreshing ? "Checking…" : "Check configuration"}
    </Button>
  );
}
