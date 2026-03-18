import { useSyncExternalStore } from "react";

import { hasScopedStorage, onStorageScopeChange, scopedStorage } from "@/lib/mmkv";

const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 50;

export interface RecentlyViewedItem {
  id: string;
  type: "movie" | "tv" | "person";
  title: string;
  imagePath: string | null;
  subtitle: string | null;
  viewedAt: number;
}

// --- In-memory cache synced with scoped MMKV ---

const listeners = new Set<() => void>();

let items: RecentlyViewedItem[] = [];

function loadItems() {
  if (!hasScopedStorage()) {
    items = [];
    return;
  }
  const raw = scopedStorage().getString(STORAGE_KEY);
  if (!raw) {
    items = [];
    return;
  }
  try {
    items = JSON.parse(raw) as RecentlyViewedItem[];
  } catch {
    items = [];
  }
}

function persist(next: RecentlyViewedItem[]) {
  if (!hasScopedStorage()) return;
  items = next;
  scopedStorage().set(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

// Load persisted items if scoped storage is already initialized
loadItems();

// Reload items when the storage scope changes (server/user switch)
onStorageScopeChange(() => {
  loadItems();
  for (const listener of listeners) listener();
});

// --- Public API ---

export function addRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  const filtered = items.filter((i) => i.id !== item.id);
  const next = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
  persist(next);
}

export function removeRecentlyViewed(id: string) {
  persist(items.filter((i) => i.id !== id));
}

export function clearRecentlyViewed() {
  persist([]);
}

// --- React hook ---

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return items;
}

export function useRecentlyViewed() {
  const data = useSyncExternalStore(subscribe, getSnapshot);
  return {
    items: data,
    addItem: addRecentlyViewed,
    removeItem: removeRecentlyViewed,
    clearAll: clearRecentlyViewed,
  };
}
