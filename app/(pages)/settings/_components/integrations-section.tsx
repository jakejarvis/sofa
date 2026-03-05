"use client";

import { IconWebhook } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteWebhookConnection,
  regenerateWebhookToken,
  saveWebhookConnection,
} from "@/lib/actions/settings";
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
  const embyConnection = connections.find((c) => c.provider === "emby") ?? null;

  async function handleConnect(provider: "plex" | "jellyfin" | "emby") {
    const label =
      provider === "plex" ? "Plex" : provider === "emby" ? "Emby" : "Jellyfin";
    try {
      const result = await saveWebhookConnection(provider);
      setConnections((prev) => [...prev, { ...result, recentEvents: [] }]);
      toast.success(`${label} connected`);
    } catch {
      toast.error(`Failed to connect ${label}`);
    }
  }

  async function handleDelete(provider: "plex" | "jellyfin" | "emby") {
    const label =
      provider === "plex" ? "Plex" : provider === "emby" ? "Emby" : "Jellyfin";
    const previous = connections;
    setConnections((prev) => prev.filter((c) => c.provider !== provider));
    try {
      await deleteWebhookConnection(provider);
      toast.success(`${label} disconnected`);
    } catch {
      setConnections(previous);
      toast.error(`Failed to disconnect ${label}`);
    }
  }

  async function handleRegenerateToken(provider: "plex" | "jellyfin" | "emby") {
    const label =
      provider === "plex" ? "Plex" : provider === "emby" ? "Emby" : "Jellyfin";
    try {
      const result = await regenerateWebhookToken(provider);
      setConnections((prev) =>
        prev.map((c) =>
          c.provider === provider ? { ...c, token: result.token } : c,
        ),
      );
      toast.success(`${label} webhook URL regenerated`);
    } catch {
      toast.error(`Failed to regenerate ${label} URL`);
    }
  }

  async function handleToggle(
    provider: "plex" | "jellyfin" | "emby",
    enabled: boolean,
  ) {
    const label =
      provider === "plex" ? "Plex" : provider === "emby" ? "Emby" : "Jellyfin";
    const previous = connections;
    setConnections((prev) =>
      prev.map((c) => (c.provider === provider ? { ...c, enabled } : c)),
    );
    try {
      await saveWebhookConnection(provider, enabled);
      toast.success(`${label} webhook ${enabled ? "enabled" : "disabled"}`);
    } catch {
      setConnections(previous);
      toast.error(`Failed to update ${label}`);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <IconWebhook className="size-4 text-muted-foreground" />
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Integrations
        </h2>
      </div>
      <div className="space-y-3">
        <WebhookCard
          provider="plex"
          connection={plexConnection}
          onConnect={handleConnect}
          onDelete={handleDelete}
          onRegenerateToken={handleRegenerateToken}
          onToggle={handleToggle}
        />
        <WebhookCard
          provider="jellyfin"
          connection={jellyfinConnection}
          onConnect={handleConnect}
          onDelete={handleDelete}
          onRegenerateToken={handleRegenerateToken}
          onToggle={handleToggle}
        />
        <WebhookCard
          provider="emby"
          connection={embyConnection}
          onConnect={handleConnect}
          onDelete={handleDelete}
          onRegenerateToken={handleRegenerateToken}
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}
