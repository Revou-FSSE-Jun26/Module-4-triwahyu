import { describe, expect, it } from "vitest";
import { ORDER_STEP, computeOrder, orderForIndex, sortByOrder } from "./ordering";

// REQ-CARD-9: the FLOAT ordering rules shared with the backend (docs/contracts/ordering.md).
describe("computeOrder", () => {
  it("uses one step for an empty column", () => expect(computeOrder()).toBe(ORDER_STEP));
  it("appends one step after the last item", () => expect(computeOrder(2048, undefined)).toBe(3072));
  it("halves the first item's order to insert before it", () => expect(computeOrder(undefined, 1024)).toBe(512));
  it("uses the midpoint between neighbours", () => expect(computeOrder(1024, 2048)).toBe(1536));
  it("always stays positive when inserting at the top repeatedly", () => {
    let next = 1024;
    for (let i = 0; i < 40; i++) next = computeOrder(undefined, next);
    expect(next).toBeGreaterThan(0);
  });
});

describe("orderForIndex", () => {
  const items = [
    { id: "a", order: 1024 },
    { id: "b", order: 2048 },
    { id: "c", order: 3072 },
  ];
  it("inserts at the top", () => expect(orderForIndex(items, 0)).toBe(512));
  it("inserts between items", () => expect(orderForIndex(items, 2)).toBe(2560));
  it("appends past the end", () => expect(orderForIndex(items, 99)).toBe(4096));
  it("ignores the moving item when computing neighbours", () => {
    // Moving "a" to index 1 means it lands between b and c.
    expect(orderForIndex(items, 1, "a")).toBe(2560);
  });
});

describe("sortByOrder", () => {
  it("sorts by order and breaks ties by id without mutating the input", () => {
    const input = [
      { id: "b", order: 1 },
      { id: "a", order: 1 },
      { id: "c", order: 0.5 },
    ];
    expect(sortByOrder(input).map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(input.map((item) => item.id)).toEqual(["b", "a", "c"]);
  });
});
