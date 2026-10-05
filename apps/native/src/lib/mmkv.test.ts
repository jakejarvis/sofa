import type { PersistedClient } from "@tanstack/query-persist-client-core";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("react-native-mmkv", () => {
  const data = new Map<string, Map<string, string>>();

  class MockMMKV {
    private readonly entries: Map<string, string>;

    constructor(config?: { id?: string }) {
      const id = config?.id ?? "default";
      let entries = data.get(id);
      if (!entries) {
        entries = new Map();
        data.set(id, entries);
      }
      this.entries = entries;
    }

    getString(key: string) {
      return this.entries.get(key);
    }

    set(key: string, value: string) {
      this.entries.set(key, value);
    }

    remove(key: string) {
      return this.entries.delete(key);
    }

    contains(key: string) {
      return this.entries.has(key);
    }
  }

  return { createMMKV: (config?: { id?: string }) => new MockMMKV(config) };
});

const {
  QUERY_CACHE_KEY,
  clearStorageScope,
  createScopedQueryPersister,
  getScopeKey,
  onStorageScopeChange,
  scopedStorage,
  setStorageScope,
} = await import("./mmkv");

function makeClient(timestamp: number): PersistedClient {
  return { timestamp, buster: "", clientState: { queries: [], mutations: [] } };
}

afterEach(() => {
  vi.useRealTimers();
  clearStorageScope();
});

describe("storage scope", () => {
  test("tracks the scope key and notifies listeners", () => {
    const listener = vi.fn<() => void>();
    const unsubscribe = onStorageScopeChange(listener);

    expect(getScopeKey()).toBeNull();

    setStorageScope("i", "u");
    expect(getScopeKey()).toBe("i_u");
    expect(listener).toHaveBeenCalledTimes(1);

    clearStorageScope();
    expect(getScopeKey()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});

describe("createScopedQueryPersister", () => {
  test("a throttled write lands in the store the persister was created with, not the current scope", async () => {
    vi.useFakeTimers();

    setStorageScope("i", "a");
    const storeA = scopedStorage();
    const persister = createScopedQueryPersister(storeA);

    const clientA1 = makeClient(1);
    const clientA2 = makeClient(2);
    // persistClient resolves only once its (possibly throttled) write has flushed.
    const writes = [persister.persistClient(clientA1), persister.persistClient(clientA2)];

    setStorageScope("i", "b");
    const storeB = scopedStorage();

    await vi.advanceTimersByTimeAsync(1100);
    await Promise.all(writes);

    const stored = storeA.getString(QUERY_CACHE_KEY);
    expect(stored).toBeDefined();
    expect(JSON.parse(stored as string)).toEqual(clientA2);
    expect(storeB.getString(QUERY_CACHE_KEY)).toBeUndefined();
  });
});
