"use client";

import { IconWebhook } from "@tabler/icons-react";
import { useState } from "react";
import {
  deleteWebhookConnection,
  regenerateWebhookToken,
  saveWebhookConnection,
} from "./actions";
import { WebhookCard, type WebhookConnection } from "./webhook-card";

export function IntegrationsSection({
  initialConnections,
}: {
  initialConnections: WebhookConnection[];
}) {
  const [connections, setConnections] =
    useState<WebhookConnection[]>(initialConnections);

  const plexConnection = connections.find((c) => c.provider === "plex") ?? null;
  const jellyfinConnection =
    connections.find((c) => c.provider === "jellyfin") ?? null;

  async function handleSave(provider: "plex" | "jellyfin", username: string) {
    const result = await saveWebhookConnection(provider, username);
    setConnections((prev) => {
      const existing = prev.find((c) => c.provider === provider);
      if (existing) {
        return prev.map((c) =>
          c.provider === provider
            ? { ...result, recentEvents: existing.recentEvents }
            : c,
        );
      }
      return [...prev, { ...result, recentEvents: [] }];
    });
  }

  async function handleDelete(provider: "plex" | "jellyfin") {
    const previous = connections;
    setConnections((prev) => prev.filter((c) => c.provider !== provider));
    try {
      await deleteWebhookConnection(provider);
    } catch {
      setConnections(previous);
    }
  }

  async function handleRegenerateToken(provider: "plex" | "jellyfin") {
    const result = await regenerateWebhookToken(provider);
    setConnections((prev) =>
      prev.map((c) =>
        c.provider === provider ? { ...c, token: result.token } : c,
      ),
    );
  }

  async function handleToggle(provider: "plex" | "jellyfin", enabled: boolean) {
    const previous = connections;
    setConnections((prev) =>
      prev.map((c) => (c.provider === provider ? { ...c, enabled } : c)),
    );
    try {
      const conn = connections.find((c) => c.provider === provider);
      await saveWebhookConnection(
        provider,
        conn?.mediaServerUsername ?? "",
        enabled,
      );
    } catch {
      setConnections(previous);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <IconWebhook size={16} className="text-muted-foreground" />
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Integrations
        </h2>
      </div>
      <div className="space-y-3">
        <WebhookCard
          provider="plex"
          connection={plexConnection}
          onSave={handleSave}
          onDelete={handleDelete}
          onRegenerateToken={handleRegenerateToken}
          onToggle={handleToggle}
        />
        <WebhookCard
          provider="jellyfin"
          connection={jellyfinConnection}
          onSave={handleSave}
          onDelete={handleDelete}
          onRegenerateToken={handleRegenerateToken}
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}
