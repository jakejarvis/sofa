import { describe, expect, test, vi } from "vitest";

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

import { getAppErrorCode, getAuthErrorMessage, getErrorMessage } from "../src/errors";

describe("getAppErrorCode", () => {
  test("recognizes a plain object carrying an app error code", () => {
    expect(getAppErrorCode({ data: { code: "JOB_NOT_FOUND" } })).toBe("JOB_NOT_FOUND");
  });

  test.each([["oops"], [null], [{}], [{ data: { code: 5 } }]])("returns null for %j", (input) => {
    expect(getAppErrorCode(input)).toBeNull();
  });
});

describe("getErrorMessage", () => {
  test("returns the English message for a mapped code", () => {
    expect(getErrorMessage({ data: { code: "JOB_NOT_FOUND" } })).toBe("Job not found");
  });

  test("falls back to the given fallback for an unknown code", () => {
    expect(getErrorMessage({ data: { code: "NOPE" } }, "Fallback")).toBe("Fallback");
  });
});

describe("getAuthErrorMessage", () => {
  test("maps a 429 status to the rate-limit message", () => {
    expect(getAuthErrorMessage({ status: 429 }, "F")).toMatch(/^Too many attempts/);
  });

  test("maps a known auth code and falls back otherwise", () => {
    expect(getAuthErrorMessage({ code: "INVALID_EMAIL" }, "F")).toBe("Enter a valid email address");
    expect(getAuthErrorMessage({ code: "UNKNOWN" }, "F")).toBe("F");
  });

  test("maps a wrong current password", () => {
    expect(getAuthErrorMessage({ code: "INVALID_PASSWORD" }, "x")).toBe(
      "Current password is incorrect",
    );
  });
});
