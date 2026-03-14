import * as SecureStore from "expo-secure-store";

import { getCurrentInstanceId } from "@/lib/server-url";

interface CachedSessionData {
  session: { id: string; expiresAt?: string; [key: string]: unknown };
  user: { id: string; [key: string]: unknown };
}

/**
 * Synchronously reads the cached session from SecureStore.
 * Better Auth's Expo plugin writes session data here on every successful
 * /get-session response, but never reads it back as a fallback.
 * We use it to seed the session atom before React renders so the app
 * can show cached data immediately when the server is unreachable.
 */
export function getCachedSession(): CachedSessionData | null {
  const instanceId = getCurrentInstanceId();
  if (!instanceId) return null;

  const key = `sofa_${instanceId}_session_data`;

  try {
    const raw = SecureStore.getItem(key);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data?.session?.id || !data?.user?.id) return null;

    // Reject obviously expired sessions
    if (data.session.expiresAt) {
      const expiry = new Date(data.session.expiresAt).getTime();
      if (expiry < Date.now()) return null;
    }

    return data as CachedSessionData;
  } catch {
    return null;
  }
}
