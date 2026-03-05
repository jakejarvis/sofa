import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import type { WebhookConnection } from "@/app/(pages)/settings/_components/webhook-card";
import {
  deleteWebhookConnection,
  regenerateWebhookToken,
  saveWebhookConnection,
} from "@/lib/actions/settings";

export const connectionsAtom = atom<WebhookConnection[]>([]);

function providerLabel(provider: "plex" | "jellyfin" | "emby") {
  return provider === "plex"
    ? "Plex"
    : provider === "emby"
      ? "Emby"
      : "Jellyfin";
}

export function useConnectionActions(provider: "plex" | "jellyfin" | "emby") {
  const [connections, setConnections] = useAtom(connectionsAtom);
  const label = providerLabel(provider);
  const connection = connections.find((c) => c.provider === provider) ?? null;

  const handleConnect = useCallback(async () => {
    try {
      const result = await saveWebhookConnection(provider);
      setConnections((prev) => [...prev, { ...result, recentEvents: [] }]);
      toast.success(`${label} connected`);
    } catch {
      toast.error(`Failed to connect ${label}`);
    }
  }, [provider, label, setConnections]);

  const handleDelete = useCallback(async () => {
    const previous = connections;
    setConnections((prev) => prev.filter((c) => c.provider !== provider));
    try {
      await deleteWebhookConnection(provider);
      toast.success(`${label} disconnected`);
    } catch {
      setConnections(previous);
      toast.error(`Failed to disconnect ${label}`);
    }
  }, [provider, label, connections, setConnections]);

  const handleRegenerateToken = useCallback(async () => {
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
  }, [provider, label, setConnections]);

  const handleToggle = useCallback(
    async (enabled: boolean) => {
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
    },
    [provider, label, connections, setConnections],
  );

  return {
    connection,
    handleConnect,
    handleDelete,
    handleRegenerateToken,
    handleToggle,
  };
}
