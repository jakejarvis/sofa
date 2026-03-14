import { globalStorage } from "@/lib/mmkv";

const SERVER_URL_KEY = "sofa_server_url";
const SERVERS_MAP_KEY = "sofa_servers";
const CURRENT_INSTANCE_KEY = "sofa_current_instance_id";
const DEFAULT_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ?? "https://sofa.example.com";

const serverUrlListeners: Array<() => void> = [];

// --- Types ---

export type ValidationResult =
  | { status: "success"; instanceId: string }
  | { status: "error"; error: ValidationError };

export type ValidationError =
  | "network_unreachable"
  | "timeout"
  | "not_sofa_server"
  | "server_unhealthy"
  | "invalid_url";

// --- URL helpers ---

export function normalizeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, "");
  if (url && !url.includes("://")) {
    url = `http://${url}`;
  }
  return url;
}

export function splitUrl(input: string): { protocol: string; host: string } {
  const match = input.match(/^(https?:\/\/)(.*)/);
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

// --- Server URL storage ---

export function getServerUrl(): string {
  return globalStorage.getString(SERVER_URL_KEY) ?? DEFAULT_URL;
}

export function setServerUrl(url: string): void {
  const normalized = url.replace(/\/+$/, "");
  globalStorage.set(SERVER_URL_KEY, normalized);
  for (const listener of serverUrlListeners) listener();
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

// --- Instance ID management ---

function getServersMap(): Record<string, string> {
  const raw = globalStorage.getString(SERVERS_MAP_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function registerServer(url: string, instanceId: string): void {
  const map = getServersMap();
  map[url] = instanceId;
  globalStorage.set(SERVERS_MAP_KEY, JSON.stringify(map));
  globalStorage.set(CURRENT_INSTANCE_KEY, instanceId);
}

export function getCurrentInstanceId(): string | null {
  return globalStorage.getString(CURRENT_INSTANCE_KEY) ?? null;
}

/**
 * Ensures the current server has a cached instance ID. For existing installs
 * that upgraded before instance IDs were introduced, or builds using
 * EXPO_PUBLIC_SERVER_URL that never visit the server-url screen, this fetches
 * the instance ID from /api/health on startup if it's missing.
 */
export async function ensureInstanceId(): Promise<string | null> {
  const existing = getCurrentInstanceId();
  if (existing) return existing;

  const serverUrl = hasStoredServerUrl()
    ? getServerUrl()
    : process.env.EXPO_PUBLIC_SERVER_URL;
  if (!serverUrl) return null;

  try {
    const res = await fetch(`${serverUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const instanceId =
      typeof data.instanceId === "string" ? data.instanceId : null;
    if (instanceId) {
      registerServer(serverUrl, instanceId);
      return instanceId;
    }
  } catch {
    // Non-critical — will retry next launch
  }
  return null;
}

// --- Validation ---

export async function validateServerUrl(
  url: string,
): Promise<ValidationResult> {
  const normalized = normalizeUrl(url);

  if (!normalized || !normalized.includes("://")) {
    return { status: "error", error: "invalid_url" };
  }

  try {
    new URL(normalized);
  } catch {
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

      const instanceId =
        typeof data.instanceId === "string" ? data.instanceId : null;
      if (!instanceId) {
        return { status: "error", error: "not_sofa_server" };
      }

      return { status: "success", instanceId };
    } catch {
      return { status: "error", error: "not_sofa_server" };
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    ) {
      return { status: "error", error: "timeout" };
    }
    return { status: "error", error: "network_unreachable" };
  }
}
