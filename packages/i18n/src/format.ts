import { i18n } from "./index";

function toDate(date: Date | string): Date {
  return typeof date === "string" ? new Date(date) : date;
}

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(i18n.locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(toDate(date));
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat(i18n.locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(toDate(date));
}

export function formatRelativeTime(date: Date | string): string {
  const d = toDate(date);
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const absSec = Math.abs(Math.round(diffMs / 1000));
  const absMin = Math.abs(Math.round(diffMs / 60_000));
  const absHour = Math.abs(Math.round(diffMs / 3_600_000));
  const absDay = Math.abs(Math.round(diffMs / 86_400_000));

  const rtf = new Intl.RelativeTimeFormat(i18n.locale, { numeric: "auto" });
  const sign = diffMs < 0 ? -1 : 1;

  if (absSec < 60) return rtf.format(sign * absSec, "second");
  if (absMin < 60) return rtf.format(sign * absMin, "minute");
  if (absHour < 24) return rtf.format(sign * absHour, "hour");
  if (absDay < 30) return rtf.format(sign * absDay, "day");
  if (absDay < 365) return rtf.format(sign * Math.round(absDay / 30), "month");
  return rtf.format(sign * Math.round(absDay / 365), "year");
}

export function formatNumber(
  n: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(i18n.locale, options).format(n);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / k ** i;
  return `${new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value)} ${sizes[i]}`;
}
