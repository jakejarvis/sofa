import { ORPCError } from "@orpc/client";
import { describe, expect, test, vi } from "vitest";

vi.mock("@sofa/i18n", () => ({
  i18n: {
    locale: "en",
    _: (descriptor: { id?: string; message?: string } | string) =>
      typeof descriptor === "string" ? descriptor : (descriptor.message ?? descriptor.id ?? ""),
  },
}));

vi.mock("@lingui/core/macro", () => ({
  msg: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    id: String.raw(strings, ...values),
    message: String.raw(strings, ...values),
  }),
}));

const { getAuthErrorMessage, getErrorMessage } = await import("./error-messages");

describe("getErrorMessage", () => {
  test("returns the English message for a mapped app error code", () => {
    const error = new ORPCError("BAD_REQUEST", { data: { code: "IMPORT_ALREADY_RUNNING" } });
    expect(getErrorMessage(error)).toBe("An import is already in progress");
  });

  test("uses the fallback for unknown codes and plain errors", () => {
    const unknown = new ORPCError("BAD_REQUEST", { data: { code: "NOT_A_REAL_CODE" } });
    expect(getErrorMessage(unknown, "Nope")).toBe("Nope");
    expect(getErrorMessage(new Error("boom"), "Nope")).toBe("Nope");
  });

  test("defaults to a generic message without a fallback", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("Something went wrong");
  });
});

describe("getAuthErrorMessage", () => {
  test("maps known Better Auth codes", () => {
    expect(getAuthErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 }, "F")).toBe(
      "Invalid email or password",
    );
  });

  test("maps rate limiting", () => {
    expect(getAuthErrorMessage({ status: 429 }, "F")).toMatch(/^Too many attempts/);
  });

  test("falls back for unknown codes and missing errors", () => {
    expect(getAuthErrorMessage({ code: "SOMETHING_ELSE", status: 500 }, "F")).toBe("F");
    expect(getAuthErrorMessage(null, "F")).toBe("F");
  });
});
