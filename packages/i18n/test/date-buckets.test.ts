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

  test("month bucket label names the bucket's month", () => {
    expect(groupByDateBucket([{ date: "2024-08-15" }])[0].label).toBe("August");
    expect(groupByDateBucket([{ date: "2024-12-03" }])[0].label).toBe("December");
  });

  test("month label doesn't depend on the process time zone", () => {
    const originalTz = process.env.TZ;
    try {
      const labels: Record<string, string> = {};
      for (const zone of ["Europe/Berlin", "Pacific/Kiritimati", "America/Los_Angeles", "UTC"]) {
        process.env.TZ = zone;
        labels[zone] = groupByDateBucket([{ date: "2024-12-03" }])[0].label;
      }
      expect(labels).toEqual({
        "Europe/Berlin": "December",
        "Pacific/Kiritimati": "December",
        "America/Los_Angeles": "December",
        UTC: "December",
      });
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });

  test("month label is right when Intl defaults to UTC (native polyfill)", () => {
    const RealDTF = Intl.DateTimeFormat;
    const originalTz = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Kiritimati"; // UTC+14
      // Emulate the polyfill's UTC default while still honouring an explicit timeZone.
      vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (
        locales?: Intl.LocalesArgument,
        options?: Intl.DateTimeFormatOptions,
      ) {
        return new RealDTF(locales, { timeZone: "UTC", ...options });
      } as unknown as typeof Intl.DateTimeFormat);
      expect(groupByDateBucket([{ date: "2024-12-03" }])[0].label).toBe("December");
    } finally {
      vi.restoreAllMocks();
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
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

describe("groupByDateBucket past option", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-12T10:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("yesterday goes to the 'yesterday' bucket", () => {
    const result = groupByDateBucket([{ date: "2024-06-11" }], { past: true });
    expect(result[0].key).toBe("yesterday");
    expect(result[0].label).toBe("Yesterday");
  });

  test("3 days ago goes to 'earlier_this_week'", () => {
    const result = groupByDateBucket([{ date: "2024-06-09" }], { past: true });
    expect(result[0].key).toBe("earlier_this_week");
    expect(result[0].label).toBe("Earlier this week");
  });

  test("20 days ago goes to a month bucket", () => {
    const result = groupByDateBucket([{ date: "2024-05-23" }], { past: true });
    expect(result[0].key).toBe("month_2024-05");
    expect(result[0].label).toBe("May");
  });

  test("default grouping is unchanged for a future date", () => {
    const result = groupByDateBucket([{ date: "2024-06-13" }]);
    expect(result[0].key).toBe("tomorrow");
  });

  test("an explicit today overrides the real date", () => {
    const result = groupByDateBucket([{ date: "2026-01-06" }], { today: "2026-01-05" });
    expect(result[0].key).toBe("tomorrow");
  });

  test("an explicit locale drives month labels", () => {
    const result = groupByDateBucket([{ date: "2026-02-20" }], {
      today: "2026-01-05",
      locale: "de",
    });
    expect(result[0].key).toBe("month_2026-02");
    expect(result[0].label).toBe("Februar");
  });
});
