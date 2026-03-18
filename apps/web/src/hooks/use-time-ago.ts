import { formatRelativeTime } from "@sofa/i18n/format";
import { useSyncExternalStore } from "react";

// Shared ticker — one interval regardless of how many components subscribe
const TICK_MS = 30_000;
let tick = Date.now();
const listeners = new Set<() => void>();
let timerId: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  if (listeners.size === 0) {
    timerId = setInterval(() => {
      tick = Date.now();
      for (const l of listeners) l();
    }, TICK_MS);
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };
}

function getSnapshot() {
  return tick;
}

function toTimestamp(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const t = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return Number.isFinite(t) ? t : null;
}

export function useTimeAgo(
  date: string | Date | null | undefined,
  { fallback = "" } = {},
): string {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const ts = toTimestamp(date);
  if (ts === null) return fallback;
  return formatRelativeTime(new Date(ts));
}
