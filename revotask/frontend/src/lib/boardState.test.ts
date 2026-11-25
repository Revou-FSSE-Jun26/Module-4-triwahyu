import { describe, expect, it } from "vitest";
import { addCard, applyMove, dropIndexFromPointer, findCard, placeCard, removeCard } from "./boardState";
import type { Card, Column } from "@/types";

const card = (id: string, column_id: string, order: number): Card => ({
  id,
  column_id,
  title: id,
  description: null,
  order,
  assignee: null,
  created_by: null,
  column_entered_at: "2026-01-01T00:00:00+00:00",
  created_at: "2026-01-01T00:00:00+00:00",
  updated_at: "2026-01-01T00:00:00+00:00",
});

const board = (): Column[] => [
  { id: "todo", board_id: "b", name: "To Do", order: 1024, is_done: false, cards: [card("a", "todo", 1024), card("b", "todo", 2048)] },
  { id: "done", board_id: "b", name: "Done", order: 2048, is_done: true, cards: [card("c", "done", 1024)] },
];

describe("applyMove (optimistic update)", () => {
  it("moves a card to another column in sorted position", () => {
    const next = applyMove(board(), "a", "done", 512);
    expect(next[0].cards.map((c) => c.id)).toEqual(["b"]);
    expect(next[1].cards.map((c) => c.id)).toEqual(["a", "c"]);
    expect(next[1].cards[0]).toMatchObject({ column_id: "done", order: 512 });
  });

  it("reorders within a column", () => {
    expect(applyMove(board(), "b", "todo", 100)[0].cards.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("does not mutate the previous state, so it can be restored", () => {
    const before = board();
    applyMove(before, "a", "done", 1);
    expect(before[0].cards.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("ignores unknown cards", () => {
    const before = board();
    expect(applyMove(before, "nope", "done", 1)).toBe(before);
  });
});

describe("rollback with placeCard", () => {
  it("puts the original card back in its original column and slot", () => {
    const original = findCard(board(), "a")!;
    const moved = applyMove(board(), "a", "done", 500);
    const restored = placeCard(moved, original);
    expect(restored[0].cards.map((c) => c.id)).toEqual(["a", "b"]);
    expect(restored[1].cards.map((c) => c.id)).toEqual(["c"]);
    expect(findCard(restored, "a")).toEqual(original);
  });
});

describe("add and remove", () => {
  it("adds a card to its column", () => {
    expect(addCard(board(), card("d", "done", 4096))[1].cards.map((c) => c.id)).toEqual(["c", "d"]);
  });
  it("removes a card everywhere", () => {
    expect(removeCard(board(), "c")[1].cards).toEqual([]);
  });
});

describe("dropIndexFromPointer", () => {
  const rects = [
    { id: "a", top: 0, height: 100 },
    { id: "b", top: 110, height: 100 },
    { id: "c", top: 220, height: 100 },
  ];
  it("drops before the first card when above its midpoint", () => expect(dropIndexFromPointer(rects, 20, "x")).toBe(0));
  it("drops between cards", () => expect(dropIndexFromPointer(rects, 170, "x")).toBe(2));
  it("drops at the end below every midpoint", () => expect(dropIndexFromPointer(rects, 900, "x")).toBe(3));
  it("ignores the dragged card itself", () => expect(dropIndexFromPointer(rects, 900, "c")).toBe(2));
});
