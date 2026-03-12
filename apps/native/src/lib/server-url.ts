import { storage } from "@/lib/mmkv";

const SERVER_URL_KEY = "sofa_server_url";
const DEFAULT_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ?? "https://sofa.example.com";

const serverUrlListeners: Array<() => void> = [];

// --- Types ---

export type ValidationResult =
  | { status: "success" }
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
  return storage.getString(SERVER_URL_KEY) ?? DEFAULT_URL;
}

export function setServerUrl(url: string): void {
  const normalized = url.replace(/\/+$/, "");
  storage.set(SERVER_URL_KEY, normalized);
  for (const listener of serverUrlListeners) listener();
}

export function onServerUrlChange(callback: () => void) {
  serverUrlListeners.push(callback);
}

export function hasStoredServerUrl(): boolean {
  return storage.contains(SERVER_URL_KEY);
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
    } catch {
      return { status: "error", error: "not_sofa_server" };
    }

    return { status: "success" };
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
