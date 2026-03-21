import { formatDate } from "./format";

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
  const d = new Date(`${today}T00:00:00`);
  const dayOfWeek = d.getDay(); // 0=Sun
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  return addDays(today, daysUntilSunday);
}

function getMonthLabel(dateStr: string): string {
  return formatDate(dateStr, { month: "long" });
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

function getBucketLabel(key: BucketKey, t: (template: TemplateStringsArray) => string): string {
  if (key === "today") return t`Today`;
  if (key === "tomorrow") return t`Tomorrow`;
  if (key === "this_week") return t`This Week`;
  if (key === "next_week") return t`Next Week`;
  if (key.startsWith("month_")) {
    return getMonthLabel(`${key.slice(6)}-01`);
  }
  return key;
}

export function groupByDateBucket<T extends { date: string }>(
  items: T[],
  t: (template: TemplateStringsArray) => string,
): DateBucket<T>[] {
  const today = getToday();
  const bucketMap = new Map<string, { label: string; items: T[] }>();
  const bucketOrder: string[] = [];

  for (const item of items) {
    const key = getBucketKey(item.date, today);
    let bucket = bucketMap.get(key);
    if (!bucket) {
      bucket = { label: getBucketLabel(key, t), items: [] };
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
