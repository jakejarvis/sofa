"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      router.refresh();
    });
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
