import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../src/index", () => ({
  i18n: {
    locale: "en",
    _: (descriptor: { id?: string; message?: string } | string) => {
      if (typeof descriptor === "string") return descriptor;
      return descriptor.message ?? descriptor.id ?? "";
    },
  },
}));

vi.mock("@lingui/core/macro", () => ({
  msg: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    id: String.raw(strings, ...values),
    message: String.raw(strings, ...values),
  }),
}));

import { formatLocalDate, groupByDateBucket } from "../src/date-buckets";

describe("formatLocalDate", () => {
  test("formats a date as YYYY-MM-DD", () => {
    expect(formatLocalDate(new Date(2024, 0, 5))).toBe("2024-01-05");
  });

  test("pads single-digit month and day", () => {
    expect(formatLocalDate(new Date(2024, 2, 3))).toBe("2024-03-03");
  });

  test("handles December correctly", () => {
    expect(formatLocalDate(new Date(2024, 11, 31))).toBe("2024-12-31");
  });
});

describe("groupByDateBucket", () => {
  // Pin "today" to a Wednesday: 2024-06-12
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-12T10:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("empty array returns empty result", () => {
    expect(groupByDateBucket([])).toEqual([]);
  });

  test("item on today goes to 'today' bucket", () => {
    const result = groupByDateBucket([{ date: "2024-06-12" }]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("today");
    expect(result[0].items).toHaveLength(1);
  });

  test("item on tomorrow goes to 'tomorrow' bucket", () => {
    const result = groupByDateBucket([{ date: "2024-06-13" }]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("tomorrow");
  });

  test("item within 6 days goes to 'this_week' bucket", () => {
    // Today is June 12 (Wed), end of week = June 18 (Tue)
    const result = groupByDateBucket([{ date: "2024-06-17" }]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("this_week");
  });

  test("item 7-13 days out goes to 'next_week' bucket", () => {
    // End of week = June 18, next week ends June 25
    const result = groupByDateBucket([{ date: "2024-06-22" }]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("next_week");
  });

  test("item 30+ days out goes to month bucket", () => {
    const result = groupByDateBucket([{ date: "2024-08-15" }]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("month_2024-08");
  });

  test("multiple items in same bucket are grouped together", () => {
    const result = groupByDateBucket([
      { date: "2024-06-12", name: "a" },
      { date: "2024-06-12", name: "b" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("today");
    expect(result[0].items).toHaveLength(2);
  });

  test("items across multiple buckets are ordered by first appearance", () => {
    const result = groupByDateBucket([
      { date: "2024-06-13" }, // tomorrow
      { date: "2024-06-12" }, // today
      { date: "2024-08-01" }, // month
    ]);
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe("tomorrow");
    expect(result[1].key).toBe("today");
    expect(result[2].key).toBe("month_2024-08");
  });

  test("bucket labels are populated", () => {
    const result = groupByDateBucket([{ date: "2024-06-12" }, { date: "2024-06-13" }]);
    expect(result[0].label).toBeTruthy();
    expect(result[1].label).toBeTruthy();
  });
});
