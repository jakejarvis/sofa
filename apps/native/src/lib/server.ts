import { expoClient } from "@better-auth/expo/client";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { adminClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { globalStorage } from "@/lib/mmkv";

// Re-exports from mmkv.ts (storage scope utilities for QueryProvider + consumers)
export {
  clearStorageScope,
  getScopeKey,
  hasScopedStorage,
  onStorageScopeChange,
  queryPersister,
  setStorageScope,
} from "@/lib/mmkv";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValidationResult =
  | { status: "success"; instanceId: string }
  | { status: "error"; error: ValidationError };

export type ValidationError =
  | "network_unreachable"
  | "timeout"
  | "not_sofa_server"
  | "server_unhealthy"
  | "invalid_url";

interface CachedSessionData {
  session: { id: string; expiresAt?: string; [key: string]: unknown };
  user: { id: string; [key: string]: unknown };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVER_URL_KEY = "sofa_server_url";
const SERVERS_MAP_KEY = "sofa_servers";
const CURRENT_INSTANCE_KEY = "sofa_current_instance_id";
const DEFAULT_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? "https://sofa.example.com";
const TRAILING_SLASHES_RE = /\/+$/;
const PROTOCOL_RE = /^(https?:\/\/)(.*)/;

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

export function normalizeUrl(input: string): string {
  let url = input.trim().replace(TRAILING_SLASHES_RE, "");
  if (url && !url.includes("://")) {
    url = `http://${url}`;
  }
  return url;
}

export function splitUrl(input: string): { protocol: string; host: string } {
  const match = input.match(PROTOCOL_RE);
  if (match) {
    return { protocol: match[1], host: match[2] };
  }
  return { protocol: "http://", host: input };
}

export function resolveUrl(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/")) return path;
  return `${getServerUrl()}${path}`;
}

// ---------------------------------------------------------------------------
// Server URL storage
// ---------------------------------------------------------------------------

const serverUrlListeners: Array<() => void> = [];

export function getServerUrl(): string {
  return globalStorage.getString(SERVER_URL_KEY) ?? DEFAULT_URL;
}

function setServerUrlInternal(url: string): void {
  const normalized = url.replace(TRAILING_SLASHES_RE, "");
  globalStorage.set(SERVER_URL_KEY, normalized);
}

export function onServerUrlChange(callback: () => void): () => void {
  serverUrlListeners.push(callback);
  return () => {
    const idx = serverUrlListeners.indexOf(callback);
    if (idx !== -1) serverUrlListeners.splice(idx, 1);
  };
}

export function hasStoredServerUrl(): boolean {
  return globalStorage.contains(SERVER_URL_KEY);
}

// ---------------------------------------------------------------------------
// Instance ID management
// ---------------------------------------------------------------------------

function getServersMap(): Record<string, string> {
  const raw = globalStorage.getString(SERVERS_MAP_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function registerServer(url: string, instanceId: string): void {
  const map = getServersMap();
  map[url] = instanceId;
  globalStorage.set(SERVERS_MAP_KEY, JSON.stringify(map));
  globalStorage.set(CURRENT_INSTANCE_KEY, instanceId);
}

export function getCurrentInstanceId(): string | null {
  return globalStorage.getString(CURRENT_INSTANCE_KEY) ?? null;
}

export async function ensureInstanceId(): Promise<string | null> {
  const existing = getCurrentInstanceId();
  if (existing) return existing;

  const serverUrl = hasStoredServerUrl() ? getServerUrl() : process.env.EXPO_PUBLIC_SERVER_URL;
  if (!serverUrl) return null;

  try {
    const res = await fetch(`${serverUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const instanceId = typeof data.instanceId === "string" ? data.instanceId : null;
    if (instanceId) {
      registerServer(serverUrl, instanceId);
      return instanceId;
    }
  } catch {
    // Non-critical — will retry next launch
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export async function validateServerUrl(url: string): Promise<ValidationResult> {
  const normalized = normalizeUrl(url);

  if (!normalized || !normalized.includes("://") || !URL.canParse(normalized)) {
    return { status: "error", error: "invalid_url" };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${normalized}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return { status: "error", error: "server_unhealthy" };
    }

    try {
      const data = await response.json();
      if (!data || typeof data !== "object" || !("status" in data)) {
        return { status: "error", error: "not_sofa_server" };
      }

      const instanceId = typeof data.instanceId === "string" ? data.instanceId : null;
      if (!instanceId) {
        return { status: "error", error: "not_sofa_server" };
      }

      return { status: "success", instanceId };
    } catch {
      return { status: "error", error: "not_sofa_server" };
    }
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      return { status: "error", error: "timeout" };
    }
    return { status: "error", error: "network_unreachable" };
  }
}

// ---------------------------------------------------------------------------
// Reachability
// ---------------------------------------------------------------------------

let isReachable = true;
const reachabilityListeners: Array<(reachable: boolean) => void> = [];

function notifyReachability() {
  for (const listener of reachabilityListeners) {
    listener(isReachable);
  }
}

function setReachable(nextReachable: boolean) {
  if (isReachable === nextReachable) return;
  isReachable = nextReachable;
  notifyReachability();
}

function isDeviceOnline(state: Network.NetworkState): boolean {
  return !!state.isConnected && state.isInternetReachable !== false;
}

function syncOnlineState(state: Network.NetworkState) {
  onlineManager.setOnline(isDeviceOnline(state) || isReachable);
}

function syncAppFocus(state: AppStateStatus) {
  focusManager.setFocused(state === "active");
}

export function isNetworkError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
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

export async function serverFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(input, init);
    setReachable(true);
    if (!onlineManager.isOnline()) {
      onlineManager.setOnline(true);
    }
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

export function onServerReachabilityChange(callback: (reachable: boolean) => void): () => void {
  reachabilityListeners.push(callback);
  return () => {
    const index = reachabilityListeners.indexOf(callback);
    if (index !== -1) reachabilityListeners.splice(index, 1);
  };
}

export function startReachabilityMonitor(): () => void {
  syncAppFocus(AppState.currentState);
  void Network.getNetworkStateAsync().then(syncOnlineState);

  const networkSubscription = Network.addNetworkStateListener(syncOnlineState);

  const appStateSubscription = AppState.addEventListener("change", (nextState) => {
    syncAppFocus(nextState);
    if (nextState === "active") {
      void Network.getNetworkStateAsync().then(syncOnlineState);
    }
  });

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
  const [prevReachable, setPrevReachable] = useState(isReachable);

  if (isReachable !== prevReachable) {
    setPrevReachable(isReachable);
    setReachableState(isReachable);
  }

  useEffect(() => {
    return onServerReachabilityChange(setReachableState);
  }, []);

  return { isReachable: reachable };
}

// ---------------------------------------------------------------------------
// Auth client
// ---------------------------------------------------------------------------

function getStoragePrefix(): string {
  const instanceId = getCurrentInstanceId();
  return instanceId ? `sofa_${instanceId}` : "sofa";
}

function buildAuthClient() {
  return createAuthClient({
    baseURL: getServerUrl(),
    fetchOptions: {
      customFetchImpl: serverFetch,
    },
    plugins: [
      adminClient(),
      genericOAuthClient(),
      expoClient({
        scheme: "sofa",
        storagePrefix: getStoragePrefix(),
        storage: SecureStore,
      }),
    ],
  });
}

export let authClient = buildAuthClient();

export function rebuildAuthClient() {
  authClient = buildAuthClient();
}

// ---------------------------------------------------------------------------
// Session seeding
// ---------------------------------------------------------------------------

function getCachedSession(): CachedSessionData | null {
  const instanceId = getCurrentInstanceId();
  if (!instanceId) return null;

  const key = `sofa_${instanceId}_session_data`;

  try {
    const raw = SecureStore.getItem(key);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data?.session?.id || !data?.user?.id) return null;

    if (data.session.expiresAt) {
      const expiry = new Date(data.session.expiresAt).getTime();
      if (expiry < Date.now()) return null;
    }

    return data as CachedSessionData;
  } catch {
    return null;
  }
}

let _cachedSessionSeeded = false;

/**
 * Seed the Better Auth session atom from SecureStore before React renders.
 * Call at module scope in the root layout. Idempotent.
 */
export function initialize(): void {
  const cached = getCachedSession();
  if (cached) {
    _cachedSessionSeeded = true;
    const sessionAtom = authClient.$store.atoms.session;
    sessionAtom.set({
      data: cached,
      error: null,
      isPending: false,
      isRefetching: true,
      refetch: sessionAtom.get().refetch,
    });
  }
}

export function wasCachedSessionSeeded(): boolean {
  return _cachedSessionSeeded;
}

export function clearCachedSessionSeeded(): void {
  _cachedSessionSeeded = false;
}

// ---------------------------------------------------------------------------
// serverManager — compound operations for server-url screen
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Server-change flag
// ---------------------------------------------------------------------------

// Signals that the next session-loss redirect should go to the server-url
// screen instead of login (set by the "Change Server" flow in settings).
let _serverChangeRequested = false;

export function requestServerChange(): void {
  _serverChangeRequested = true;
}

export function consumeServerChangeRequest(): boolean {
  const was = _serverChangeRequested;
  _serverChangeRequested = false;
  return was;
}

// ---------------------------------------------------------------------------
// serverManager — compound operations for server-url screen
// ---------------------------------------------------------------------------

export const serverManager = {
  validateServerUrl,
  normalizeUrl,
  hasStoredServerUrl,

  /**
   * Atomically register a validated server and switch to it.
   * Rebuilds the auth client and notifies URL change listeners.
   */
  connectToServer(url: string, instanceId: string): void {
    registerServer(url, instanceId);
    setServerUrlInternal(url);
    // Validation just succeeded, so mark the server as reachable before
    // rebuilding. This prevents a banner flash between the monitor starting
    // (once hasServerUrl becomes true) and the first successful fetch.
    setReachable(true);
    authClient = buildAuthClient();
    for (const listener of serverUrlListeners) listener();
  },
};
