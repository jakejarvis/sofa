import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createMMKV } from "react-native-mmkv";

// Global storage — app-wide settings, server mappings, analytics
export const globalStorage = createMMKV();

// Server+user scoped storage — switches when scope changes
let scopedStore: ReturnType<typeof createMMKV> | null = null;
let currentScopeKey: string | null = null;

const scopeChangeListeners: Array<() => void> = [];

export function scopedStorage() {
  if (!scopedStore) throw new Error("Scoped storage not initialized");
  return scopedStore;
}

export function hasScopedStorage(): boolean {
  return scopedStore !== null;
}

export function getScopeKey(): string | null {
  return currentScopeKey;
}

export function setStorageScope(instanceId: string, userId: string) {
  currentScopeKey = `${instanceId}_${userId}`;
  scopedStore = createMMKV({ id: currentScopeKey });
  for (const listener of scopeChangeListeners) listener();
}

export function clearStorageScope() {
  currentScopeKey = null;
  scopedStore = null;
  for (const listener of scopeChangeListeners) listener();
}

export function onStorageScopeChange(callback: () => void): () => void {
  scopeChangeListeners.push(callback);
  return () => {
    const idx = scopeChangeListeners.indexOf(callback);
    if (idx !== -1) scopeChangeListeners.splice(idx, 1);
  };
}

export const QUERY_CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

/** A query persister bound to one scope's store, so delayed (throttled) writes can't land in
 * another server/user's partition after a switch. */
export function createScopedQueryPersister(store: ReturnType<typeof createMMKV>) {
  return createAsyncStoragePersister({
    storage: {
      getItem: (key) => store.getString(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => void store.remove(key),
    },
    key: QUERY_CACHE_KEY,
  });
}
