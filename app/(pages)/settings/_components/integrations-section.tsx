"use client";

import { IconWebhook } from "@tabler/icons-react";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { connectionsAtom } from "@/lib/atoms/integrations";
import { WebhookCard, type WebhookConnection } from "./webhook-card";

export function IntegrationsSection({
  initialConnections,
}: {
  initialConnections: WebhookConnection[];
}) {
  const [store] = useState(() => {
    const s = createStore();
    s.set(connectionsAtom, initialConnections);
    return s;
  });

  return (
    <Provider store={store}>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <IconWebhook className="size-4 text-muted-foreground" />
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Integrations
          </h2>
        </div>
        <div className="space-y-3">
          <WebhookCard provider="plex" />
          <WebhookCard provider="jellyfin" />
          <WebhookCard provider="emby" />
        </div>
      </div>
    </Provider>
  );
}
