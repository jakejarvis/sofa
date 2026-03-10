import * as SecureStore from "expo-secure-store";

const SERVER_URL_KEY = "sofa_server_url";
const DEFAULT_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ?? "http://localhost:3000";

let cachedUrl: string = "";

export function getServerUrl(): string {
  if (cachedUrl) return cachedUrl;
  const stored = SecureStore.getItem(SERVER_URL_KEY);
  cachedUrl = stored ?? DEFAULT_URL;
  return cachedUrl;
}

export async function setServerUrl(url: string): Promise<void> {
  const normalized = url.replace(/\/+$/, "");
  await SecureStore.setItemAsync(SERVER_URL_KEY, normalized);
  cachedUrl = normalized;
}

export function hasStoredServerUrl(): boolean {
  return SecureStore.getItem(SERVER_URL_KEY) !== null;
}

export async function getStoredServerUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(SERVER_URL_KEY);
}

export async function validateServerUrl(url: string): Promise<boolean> {
  try {
    const normalized = url.replace(/\/+$/, "");
    const response = await fetch(`${normalized}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
