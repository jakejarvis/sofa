import { describe, expect, test } from "vitest";

import { mapWithConcurrency } from "../src/concurrency";

describe("mapWithConcurrency", () => {
  test("runs every item and returns results in input order", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapWithConcurrency(
      items,
      async (n) => {
        // Reverse completion order relative to input order
        await new Promise((r) => setTimeout(r, (6 - n) * 2));
        return n * 10;
      },
      2,
    );

    expect(results).toEqual(items.map((n) => ({ status: "fulfilled", value: n * 10 })));
  });

  test("never has more than `concurrency` calls in flight", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);

    const results = await mapWithConcurrency(
      items,
      async (n) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        return n;
      },
      3,
    );

    expect(results).toHaveLength(20);
    expect(maxInFlight).toBe(3);
  });

  test("a rejecting item yields a rejected result at its index and the others still run", async () => {
    const ran: number[] = [];
    const results = await mapWithConcurrency(
      [0, 1, 2, 3],
      async (n) => {
        ran.push(n);
        if (n === 1) throw new Error("boom");
        return n;
      },
      2,
    );

    expect(ran.toSorted()).toEqual([0, 1, 2, 3]);
    expect(results[0]).toEqual({ status: "fulfilled", value: 0 });
    expect(results[1].status).toBe("rejected");
    expect(results[2]).toEqual({ status: "fulfilled", value: 2 });
    expect(results[3]).toEqual({ status: "fulfilled", value: 3 });
  });

  test("empty input resolves to an empty array", async () => {
    expect(await mapWithConcurrency([], async () => 1, 3)).toEqual([]);
  });
});
