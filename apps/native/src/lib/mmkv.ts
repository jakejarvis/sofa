import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV();

const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => void storage.remove(key),
};

export const QUERY_CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

export const queryPersister = createAsyncStoragePersister({
  storage: mmkvStorage,
  key: QUERY_CACHE_KEY,
});
