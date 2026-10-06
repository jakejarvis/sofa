import { describe, expect, test, vi } from "vitest";

vi.mock("@sofa/i18n", () => ({ i18n: { locale: "en" } }));

import { formatLocalTimeOfDay } from "@/lib/format-time";

describe("formatLocalTimeOfDay", () => {
  test("renders the local hour and minutes", () => {
    const result = formatLocalTimeOfDay(new Date(2026, 5, 15, 21, 5));
    expect(result).toMatch(/9|21/);
    expect(result).toContain("05");
  });

  test("is independent of the date part", () => {
    expect(formatLocalTimeOfDay(new Date(2026, 0, 1, 7, 30))).toBe(
      formatLocalTimeOfDay(new Date(2030, 11, 31, 7, 30)),
    );
  });
});
