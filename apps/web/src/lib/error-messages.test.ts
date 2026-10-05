import { ORPCError } from "@orpc/client";
import { describe, expect, test } from "vitest";

import { getErrorMessage } from "./error-messages";

describe("getErrorMessage", () => {
  test("renders the English message for a mapped app error code", () => {
    const error = new ORPCError("BAD_REQUEST", { data: { code: "IMPORT_ALREADY_RUNNING" } });
    const message = getErrorMessage(error);
    expect(message).not.toBe("");
    expect(message).toBe("An import is already in progress");
  });

  test("uses the fallback for unknown codes and plain errors", () => {
    const unknown = new ORPCError("BAD_REQUEST", { data: { code: "NOT_A_REAL_CODE" } });
    expect(getErrorMessage(unknown, "Nope")).toBe("Nope");
    expect(getErrorMessage(new Error("boom"), "Nope")).toBe("Nope");
    expect(getErrorMessage(new Error("boom"))).toBe("Something went wrong");
  });
});
