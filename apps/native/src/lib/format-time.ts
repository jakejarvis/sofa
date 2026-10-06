import { formatDate } from "@sofa/i18n/format";

/**
 * Formats the device-local time of day (e.g. "9:05 PM" / "21:05") for a Date.
 *
 * The native Intl polyfill has no time-zone data and defaults to UTC, so we
 * read the local hours/minutes from the Date and format them as a synthetic
 * UTC instant. This keeps locale-aware 12/24h formatting with device-local time.
 */
export function formatLocalTimeOfDay(date: Date): string {
  return formatDate(new Date(Date.UTC(2000, 0, 1, date.getHours(), date.getMinutes())), {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
