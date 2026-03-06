import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import type { IntegrationConnection } from "@/app/(pages)/settings/_components/integration-card";
import {
  deleteIntegration,
  regenerateIntegrationToken,
  saveIntegration,
} from "@/lib/actions/settings";

export const connectionsAtom = atom<IntegrationConnection[]>([]);

export function useConnectionActions(provider: string, label: string) {
  const [connections, setConnections] = useAtom(connectionsAtom);
  const connection = connections.find((c) => c.provider === provider) ?? null;

  const handleConnect = useCallback(async () => {
    try {
      const result = await saveIntegration(provider);
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
      await deleteIntegration(provider);
      toast.success(`${label} disconnected`);
    } catch {
      setConnections(previous);
      toast.error(`Failed to disconnect ${label}`);
    }
  }, [provider, label, connections, setConnections]);

  const handleRegenerateToken = useCallback(async () => {
    try {
      const result = await regenerateIntegrationToken(provider);
      setConnections((prev) =>
        prev.map((c) =>
          c.provider === provider ? { ...c, token: result.token } : c,
        ),
      );
      toast.success(`${label} URL regenerated`);
    } catch {
      toast.error(`Failed to regenerate ${label} URL`);
    }
  }, [provider, label, setConnections]);

  return {
    connection,
    handleConnect,
    handleDelete,
    handleRegenerateToken,
  };
}
