import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../src/index", () => ({
  i18n: { locale: "en" },
}));

import {
  formatBytes,
  formatDate,
  formatNumber,
  formatRelativeTime,
  formatShortDate,
} from "../src/format";

describe("formatDate", () => {
  test("formats a Date object", () => {
    const result = formatDate(new Date("2024-06-15T12:00:00Z"));
    expect(result).toContain("2024");
    expect(result).toContain("15");
  });

  test("formats date-only ISO string in UTC to avoid off-by-one", () => {
    // "1990-05-15" is parsed as UTC midnight — formatting in UTC prevents
    // users west of UTC from seeing May 14 instead of May 15
    const result = formatDate("1990-05-15");
    expect(result).toContain("15");
    expect(result).toContain("1990");
  });

  test("respects custom options", () => {
    const result = formatDate("2024-06-15", { month: "short" });
    expect(result).toContain("Jun");
  });

  test("does not force UTC when a timeZone option is provided", () => {
    const result = formatDate("2024-06-15", { timeZone: "America/New_York" });
    expect(result).toBeDefined();
  });

  test("formats a full ISO datetime string (not date-only)", () => {
    const result = formatDate("2024-06-15T18:30:00Z");
    expect(result).toContain("2024");
  });
});

describe("formatShortDate", () => {
  test("formats with short month", () => {
    // Use a local Date to avoid UTC-to-local day shift
    const result = formatShortDate(new Date(2024, 0, 3));
    expect(result).toContain("Jan");
    expect(result).toContain("3");
    expect(result).toContain("2024");
  });

  test("accepts a Date object", () => {
    const result = formatShortDate(new Date(2024, 11, 25));
    expect(result).toContain("Dec");
    expect(result).toContain("25");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("seconds ago", () => {
    const result = formatRelativeTime("2024-06-15T11:59:30Z");
    expect(result).toContain("30 seconds ago");
  });

  test("minutes ago", () => {
    const result = formatRelativeTime("2024-06-15T11:55:00Z");
    expect(result).toContain("5 minutes ago");
  });

  test("hours ago", () => {
    const result = formatRelativeTime("2024-06-15T09:00:00Z");
    expect(result).toContain("3 hours ago");
  });

  test("days ago", () => {
    const result = formatRelativeTime("2024-06-10T12:00:00Z");
    expect(result).toContain("5 days ago");
  });

  test("months ago", () => {
    const result = formatRelativeTime("2024-03-15T12:00:00Z");
    expect(result).toContain("3 months ago");
  });

  test("years ago", () => {
    const result = formatRelativeTime("2022-06-15T12:00:00Z");
    expect(result).toContain("2 years ago");
  });

  test("future seconds", () => {
    const result = formatRelativeTime("2024-06-15T12:00:45Z");
    expect(result).toContain("in 45 seconds");
  });

  test("future days", () => {
    const result = formatRelativeTime("2024-06-20T12:00:00Z");
    expect(result).toContain("in 5 days");
  });
});

describe("formatNumber", () => {
  test("formats a number", () => {
    expect(formatNumber(1234)).toBe("1,234");
  });

  test("respects options", () => {
    const result = formatNumber(0.5, { style: "percent" });
    expect(result).toBe("50%");
  });
});

describe("formatBytes", () => {
  test("zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  test("kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });

  test("megabytes", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });

  test("gigabytes", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });

  test("fractional megabytes", () => {
    expect(formatBytes(1536 * 1024)).toBe("1.5 MB");
  });
});
