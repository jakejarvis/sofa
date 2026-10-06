import { describe, expect, test } from "vitest";

import { formatFieldErrors } from "./fields";

describe("formatFieldErrors", () => {
  test("passes strings through", () => {
    expect(formatFieldErrors(["Required"])).toBe("Required");
  });

  test("renders message from issue objects", () => {
    expect(formatFieldErrors([{ message: "x", path: ["a"] }])).toBe("x");
  });

  test("joins mixed arrays with a comma", () => {
    expect(formatFieldErrors(["a", { message: "b" }])).toBe("a, b");
  });

  test("returns empty string for no errors", () => {
    expect(formatFieldErrors([])).toBe("");
  });
});
