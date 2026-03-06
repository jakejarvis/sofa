"use client";

import { IconWebhook } from "@tabler/icons-react";
import { useHydrateAtoms } from "jotai/utils";
import { connectionsAtom } from "@/lib/atoms/integrations";
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
  useHydrateAtoms([[connectionsAtom, initialConnections]]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <IconWebhook
          aria-hidden={true}
          className="size-4 text-muted-foreground"
        />
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Integrations
        </h2>
      </div>
      <div className="space-y-3">
        {INTEGRATION_CONFIGS.map((config) => (
          <IntegrationCard key={config.provider} config={config} />
        ))}
      </div>
    </div>
  );
}
