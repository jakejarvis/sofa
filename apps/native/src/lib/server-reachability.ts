import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { getServerUrl, hasStoredServerUrl } from "@/lib/server-url";

const REACHABLE_POLL_MS = 60_000;
const UNREACHABLE_POLL_MS = 15_000;
const PROBE_TIMEOUT_MS = 5_000;

// --- Singleton state ---

let isReachable = true; // Optimistic default
const listeners: Array<(reachable: boolean) => void> = [];

function notify() {
  for (const l of listeners) l(isReachable);
}

async function probe(): Promise<boolean> {
  if (!hasStoredServerUrl() && !process.env.EXPO_PUBLIC_SERVER_URL) return true;

  try {
    const res = await fetch(`${getServerUrl()}/api/health`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkReachability(): Promise<boolean> {
  const wasReachable = isReachable;
  isReachable = await probe();

  if (wasReachable !== isReachable) {
    notify();
  }

  return isReachable;
}

export function getIsReachable(): boolean {
  return isReachable;
}

export function onServerReachabilityChange(
  callback: (reachable: boolean) => void,
): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

// --- Polling + AppState lifecycle ---

let pollTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePoll() {
  if (pollTimer) clearTimeout(pollTimer);
  const interval = isReachable ? REACHABLE_POLL_MS : UNREACHABLE_POLL_MS;
  pollTimer = setTimeout(async () => {
    await checkReachability();
    schedulePoll();
  }, interval);
}

export function startReachabilityMonitor(): () => void {
  checkReachability().then(() => schedulePoll());

  const sub = AppState.addEventListener("change", (nextState) => {
    if (nextState === "active") {
      checkReachability();
    }
  });

  return () => {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    sub.remove();
  };
}

// --- React hook ---

export function useServerReachability() {
  const [reachable, setReachable] = useState(isReachable);

  useEffect(() => {
    setReachable(isReachable);
    return onServerReachabilityChange(setReachable);
  }, []);

  return { isReachable: reachable, retry: checkReachability };
}
