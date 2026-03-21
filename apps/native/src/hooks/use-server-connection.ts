import { msg } from "@lingui/core/macro";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { clearStorageScope, hasScopedStorage, setStorageScope } from "@/lib/mmkv";
import { queryClient } from "@/lib/query-client";
import {
  authClient,
  clearCachedSessionSeeded,
  consumeServerChangeRequest,
  ensureInstanceId,
  getCurrentInstanceId,
  hasStoredServerUrl,
  onServerReachabilityChange,
  onServerUrlChange,
  rebuildAuthClient,
  startReachabilityMonitor,
  wasCachedSessionSeeded,
} from "@/lib/server";
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

  const { data: session, isPending, isRefetching } = authClient.useSession();
  const hasServerUrl = !!process.env.EXPO_PUBLIC_SERVER_URL || hasStoredServerUrl();

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
        }
      }),
    [],
  );

  // Track whether the session was seeded from cache and hasn't yet been
  // confirmed by the server. Once confirmed, flip to false so explicit
  // sign-outs don't show a misleading "session expired" toast.
  const hadOptimisticSession = useRef(wasCachedSessionSeeded());
  const prevSession = useRef(session);

  if (hadOptimisticSession.current && session && !isRefetching) {
    hadOptimisticSession.current = false;
  }

  const { replace } = useRouter();

  // Navigate to auth when session is lost. Stack.Protected handles screen
  // availability, but enableFreeze can prevent the navigator from
  // transitioning on its own.
  useEffect(() => {
    if (prevSession.current && !session) {
      const changingServer = consumeServerChangeRequest();
      replace(changingServer ? "/(auth)/server-url" : "/(auth)/login");

      if (hadOptimisticSession.current) {
        toast.info(i18n._(msg`Session expired`), {
          description: i18n._(msg`Please sign in again.`),
        });
        clearCachedSessionSeeded();
      }
    }
    prevSession.current = session;
  }, [session, replace]);

  return { session, isPending, hasServerUrl, instanceId };
}
