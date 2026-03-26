import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

import { IntegrationCard, type IntegrationConnection } from "./integration-card";
import { INTEGRATION_CONFIGS } from "./integration-configs";

export function IntegrationsSection() {
  const { data, isPending } = useQuery(orpc.account.integrations.list.queryOptions());
  const [localConnections, setLocalConnections] = useState<IntegrationConnection[] | null>(null);

  // Use local state if user has modified connections, else use query data
  const connections = localConnections ?? data?.integrations ?? [];

  function handleSetConnections(
    updater: IntegrationConnection[] | ((prev: IntegrationConnection[]) => IntegrationConnection[]),
  ) {
    setLocalConnections((prev) => {
      const current = prev ?? data?.integrations ?? [];
      return typeof updater === "function" ? updater(current) : updater;
    });
  }

  return isPending ? (
    <div className="space-y-2.5">
      {INTEGRATION_CONFIGS.map((c) => (
        <Skeleton key={c.provider} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  ) : (
    <div className="space-y-2.5">
      {INTEGRATION_CONFIGS.map((config) => (
        <IntegrationCard
          key={config.provider}
          config={config}
          connection={
            connections.find((c: IntegrationConnection) => c.provider === config.provider) ?? null
          }
          setConnections={handleSetConnections}
        />
      ))}
    </div>
  );
}
