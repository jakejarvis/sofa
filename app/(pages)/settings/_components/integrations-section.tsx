"use client";

import { IconWebhook } from "@tabler/icons-react";
import { useState } from "react";
import {
  IntegrationCard,
  type IntegrationConnection,
} from "./integration-card";
import { INTEGRATION_CONFIGS } from "./integration-configs";

export function IntegrationsSection({
  initialConnections,
}: {
  initialConnections: IntegrationConnection[];
}) {
  const [connections, setConnections] = useState(initialConnections);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <IconWebhook
          aria-hidden={true}
          className="size-4 text-muted-foreground"
        />
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Integrations
        </h2>
      </div>
      <div className="space-y-3">
        {INTEGRATION_CONFIGS.map((config) => (
          <IntegrationCard
            key={config.provider}
            config={config}
            connection={
              connections.find((c) => c.provider === config.provider) ?? null
            }
            setConnections={setConnections}
          />
        ))}
      </div>
    </div>
  );
}
