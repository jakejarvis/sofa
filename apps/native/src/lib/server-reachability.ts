import { focusManager, onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { onServerUrlChange } from "@/lib/server-url";

let isReachable = true;
const listeners: Array<(reachable: boolean) => void> = [];

function notify() {
  for (const listener of listeners) {
    listener(isReachable);
  }
}

function setReachable(nextReachable: boolean) {
  if (isReachable === nextReachable) {
    return;
  }

  isReachable = nextReachable;
  notify();
}

function isDeviceOnline(state: Network.NetworkState): boolean {
  return !!state.isConnected && state.isInternetReachable !== false;
}

function syncOnlineState(state: Network.NetworkState) {
  onlineManager.setOnline(isDeviceOnline(state));
}

function syncAppFocus(state: AppStateStatus) {
  focusManager.setFocused(state === "active");
}

export function isNetworkError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("network request failed") ||
    message.includes("fetch failed") ||
    message.includes("load failed") ||
    message.includes("unable to resolve host") ||
    message.includes("could not connect") ||
    message.includes("connection refused") ||
    message.includes("connection abort") ||
    message.includes("internet connection appears to be offline") ||
    message.includes("timed out")
  );
}

export async function serverFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    const response = await fetch(input, init);

    // Any HTTP response proves we reached the server, even if the
    // endpoint itself returned a 4xx/5xx application error.
    setReachable(true);

    return response;
  } catch (error) {
    if (isNetworkError(error)) {
      setReachable(false);
    }

    throw error;
  }
}

export function getIsReachable(): boolean {
  return isReachable;
}

export function onServerReachabilityChange(
  callback: (reachable: boolean) => void,
): () => void {
  listeners.push(callback);

  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

export function startReachabilityMonitor(): () => void {
  syncAppFocus(AppState.currentState);
  void Network.getNetworkStateAsync().then(syncOnlineState);

  const networkSubscription = Network.addNetworkStateListener(syncOnlineState);

  const appStateSubscription = AppState.addEventListener(
    "change",
    (nextState) => {
      syncAppFocus(nextState);

      if (nextState === "active") {
        void Network.getNetworkStateAsync().then(syncOnlineState);
      }
    },
  );

  const removeServerUrlListener = onServerUrlChange(() => {
    setReachable(true);
    void Network.getNetworkStateAsync().then(syncOnlineState);
  });

  return () => {
    networkSubscription.remove();
    appStateSubscription.remove();
    removeServerUrlListener();
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
  };
}

export function useServerReachability() {
  const [reachable, setReachableState] = useState(isReachable);

  useEffect(() => {
    setReachableState(isReachable);
    return onServerReachabilityChange(setReachableState);
  }, []);

  return { isReachable: reachable };
}
