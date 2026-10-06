import { describe, expect, it } from "vitest";

import { dedupeById } from "./dedupe-by-id";

describe("dedupeById", () => {
  it("keeps order and drops later duplicates", () => {
    const result = dedupeById([
      { id: "a", n: 1 },
      { id: "b", n: 2 },
      { id: "a", n: 3 },
      { id: "c", n: 4 },
      { id: "b", n: 5 },
    ]);
    expect(result).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 2 },
      { id: "c", n: 4 },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(dedupeById([])).toEqual([]);
  });
});
