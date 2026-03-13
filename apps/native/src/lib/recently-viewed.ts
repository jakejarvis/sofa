import { useSyncExternalStore } from "react";
import { storage } from "@/lib/mmkv";
import { onServerUrlChange } from "@/lib/server-url";

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

// --- In-memory cache synced with MMKV ---

const listeners = new Set<() => void>();

let items: RecentlyViewedItem[] = (() => {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RecentlyViewedItem[];
  } catch {
    return [];
  }
})();

function persist(next: RecentlyViewedItem[]) {
  items = next;
  storage.set(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

// --- Public API ---

export function addRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  const filtered = items.filter((i) => i.id !== item.id);
  const next = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(
    0,
    MAX_ITEMS,
  );
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

// Clear recently-viewed when the user switches servers — stored IDs
// are server-specific and become dead links on a different backend.
onServerUrlChange(() => {
  clearRecentlyViewed();
});
