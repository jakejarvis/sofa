import { msg } from "@lingui/core/macro";

import { i18n } from "./index";

export type DateBucket<T> = {
  key: string;
  label: string;
  items: T[];
};

export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getToday(): string {
  return formatLocalDate(new Date());
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function getEndOfWeek(today: string): string {
  return addDays(today, 6);
}

function getMonthLabel(dateStr: string, locale: string): string {
  // Format a UTC instant in UTC: correct regardless of the formatter's default time zone
  // (the native Intl polyfill defaults to UTC; browsers use the device zone).
  const d = new Date(`${dateStr}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(d);
}

type BucketKey = "today" | "tomorrow" | "this_week" | "next_week" | string;

function getBucketKey(dateStr: string, today: string): BucketKey {
  if (dateStr === today) return "today";
  const tomorrow = addDays(today, 1);
  if (dateStr === tomorrow) return "tomorrow";
  const endOfWeek = getEndOfWeek(today);
  if (dateStr <= endOfWeek) return "this_week";
  const endOfNextWeek = addDays(endOfWeek, 7);
  if (dateStr <= endOfNextWeek) return "next_week";
  return `month_${dateStr.slice(0, 7)}`;
}

function getPastBucketKey(dateStr: string, today: string): BucketKey {
  if (dateStr === today) return "today";
  if (dateStr === addDays(today, -1)) return "yesterday";
  if (dateStr >= addDays(today, -6)) return "earlier_this_week";
  return `month_${dateStr.slice(0, 7)}`;
}

function getBucketLabel(key: BucketKey, locale: string): string {
  if (key === "today") return i18n._(msg`Today`);
  if (key === "tomorrow") return i18n._(msg`Tomorrow`);
  if (key === "yesterday") return i18n._(msg`Yesterday`);
  if (key === "earlier_this_week") return i18n._(msg`Earlier this week`);
  if (key === "this_week") return i18n._(msg`This Week`);
  if (key === "next_week") return i18n._(msg`Next Week`);
  if (key.startsWith("month_")) {
    return getMonthLabel(`${key.slice(6)}-01`, locale);
  }
  return key;
}

export function groupByDateBucket<T extends { date: string }>(
  items: T[],
  options?: { past?: boolean; today?: string; locale?: string },
): DateBucket<T>[] {
  const bucketKeyFor = options?.past ? getPastBucketKey : getBucketKey;
  const today = options?.today ?? getToday();
  const locale = options?.locale ?? i18n.locale;
  const bucketMap = new Map<string, { label: string; items: T[] }>();
  const bucketOrder: string[] = [];

  for (const item of items) {
    const key = bucketKeyFor(item.date, today);
    let bucket = bucketMap.get(key);
    if (!bucket) {
      bucket = { label: getBucketLabel(key, locale), items: [] };
      bucketMap.set(key, bucket);
      bucketOrder.push(key);
    }
    bucket.items.push(item);
  }

  return bucketOrder.map((key) => {
    const bucket = bucketMap.get(key)!;
    return { key, label: bucket.label, items: bucket.items };
  });
}
