import { msg } from "@lingui/core/macro";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { clearStorageScope, hasScopedStorage, setStorageScope } from "@/lib/mmkv";
import { queryClient } from "@/lib/query-client";
import {
  authClient,
  ensureInstanceId,
  getCurrentInstanceId,
  onServerReachabilityChange,
  onServerUrlChange,
  rebuildAuthClient,
  startReachabilityMonitor,
  useHasServerUrl,
} from "@/lib/server";
import { consumeSessionEndReason } from "@/lib/session-end";
import { toast } from "@/lib/toast";
import { i18n } from "@sofa/i18n";

/**
 * Manages the full server connection lifecycle:
 * - URL change subscriptions
 * - Instance ID resolution
 * - Auth client rebuilding
 * - Scoped storage management
 * - Reachability monitoring
 * - Session reconciliation and expiry detection
 */
export function useServerConnection() {
  // Force re-render when server URL changes so useSession()
  // re-subscribes to the rebuilt authClient's session atom.
  const [, setUrlVersion] = useState(0);
  useEffect(
    () =>
      onServerUrlChange(() => {
        queryClient.clear();
        setUrlVersion((n) => n + 1);
      }),
    [],
  );

  const { data: session, isPending } = authClient.useSession();
  const hasServerUrl = useHasServerUrl();

  // --- Instance ID resolution ---
  const [instanceId, setInstanceId] = useState(getCurrentInstanceId);

  useEffect(() => {
    if (!instanceId && hasServerUrl) {
      ensureInstanceId().then((id) => {
        if (id) {
          setInstanceId(id);
          rebuildAuthClient();
        }
      });
    }
  }, [instanceId, hasServerUrl]);

  // Re-sync instanceId when server URL changes
  useEffect(() => onServerUrlChange(() => setInstanceId(getCurrentInstanceId())), []);

  // --- Scoped storage (per instance + user) ---
  const userId = session?.user?.id;

  useEffect(() => {
    if (instanceId && userId) {
      setStorageScope(instanceId, userId);
    } else if (!userId && hasScopedStorage()) {
      clearStorageScope();
    }
  }, [instanceId, userId]);

  // --- Reachability monitor ---
  useEffect(() => {
    if (!hasServerUrl) return;
    return startReachabilityMonitor();
  }, [hasServerUrl]);

  // --- Session reconciliation ---
  // Re-validate session when server comes back online.
  useEffect(
    () =>
      onServerReachabilityChange((reachable) => {
        if (reachable) {
          authClient.$store.atoms.session.get().refetch?.();
          void queryClient.refetchQueries({
            type: "active",
            predicate: (q) => q.state.status === "error",
          });
        }
      }),
    [],
  );

  const { replace } = useRouter();
  const prevSessionRef = useRef(session);

  // Navigate to auth when session is lost. Stack.Protected handles screen
  // availability, but enableFreeze can prevent the navigator from
  // transitioning on its own. The previous-session comparison lives in the
  // effect (via a ref) because a render-phase setState discards that render's
  // locals, so a render-local "sessionLost" flag would never be committed.
  useEffect(() => {
    const hadSession = prevSessionRef.current != null;
    prevSessionRef.current = session;
    if (session) return;
    if (!hadSession) return;

    const reason = consumeSessionEndReason();
    replace(reason === "server-change" ? "/(auth)/server-url" : "/(auth)/login");

    if (reason === null) {
      toast.info(i18n._(msg`Session expired`), {
        description: i18n._(msg`Please sign in again.`),
      });
    }
  }, [session, replace]);

  return { session, isPending, hasServerUrl, instanceId };
}
