import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createMMKV } from "react-native-mmkv";

// Global storage — app-wide settings, server mappings, analytics
export const globalStorage = createMMKV();

// Server+user scoped storage — switches when scope changes
let _scopedStore: ReturnType<typeof createMMKV> | null = null;
let _currentScopeKey: string | null = null;

const scopeChangeListeners: Array<() => void> = [];

export function scopedStorage() {
  if (!_scopedStore) throw new Error("Scoped storage not initialized");
  return _scopedStore;
}

export function hasScopedStorage(): boolean {
  return _scopedStore !== null;
}

export function getScopeKey(): string | null {
  return _currentScopeKey;
}

export function setStorageScope(instanceId: string, userId: string) {
  _currentScopeKey = `${instanceId}_${userId}`;
  _scopedStore = createMMKV({ id: _currentScopeKey });
  for (const listener of scopeChangeListeners) listener();
}

export function clearStorageScope() {
  _currentScopeKey = null;
  _scopedStore = null;
  for (const listener of scopeChangeListeners) listener();
}

export function onStorageScopeChange(callback: () => void): () => void {
  scopeChangeListeners.push(callback);
  return () => {
    const idx = scopeChangeListeners.indexOf(callback);
    if (idx !== -1) scopeChangeListeners.splice(idx, 1);
  };
}

// Query persister — reads/writes through _scopedStore via closure
const scopedMmkvStorage = {
  getItem: (key: string) => _scopedStore?.getString(key) ?? null,
  setItem: (key: string, value: string) => _scopedStore?.set(key, value),
  removeItem: (key: string) => void _scopedStore?.remove(key),
};

export const QUERY_CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

export const queryPersister = createAsyncStoragePersister({
  storage: scopedMmkvStorage,
  key: QUERY_CACHE_KEY,
});
