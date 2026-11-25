import { describe, expect, it } from "vitest";
import { groupByBoard } from "./tasks";
import type { TaskCard } from "@/types";

const task = (id: string, boardId: string, boardName: string): TaskCard => ({
  id,
  column_id: "c",
  title: id,
  description: null,
  order: 1,
  assignee: null,
  created_by: null,
  column_entered_at: "",
  created_at: "",
  updated_at: "",
  board: { id: boardId, name: boardName },
  column: { id: "c", name: "To Do" },
});

// REQ-CARD-7: My Tasks groups assigned cards by board name.
describe("groupByBoard", () => {
  it("groups cards under their board and sorts boards by name", () => {
    const groups = groupByBoard([task("1", "b2", "Zeta"), task("2", "b1", "Alpha"), task("3", "b2", "Zeta")]);
    expect(groups.map((g) => [g.boardName, g.cards.map((c) => c.id)])).toEqual([
      ["Alpha", ["2"]],
      ["Zeta", ["1", "3"]],
    ]);
  });

  it("returns an empty list for no tasks", () => expect(groupByBoard([])).toEqual([]));

  it("keeps two boards with the same name separate", () => {
    expect(groupByBoard([task("1", "b1", "Sprint"), task("2", "b2", "Sprint")])).toHaveLength(2);
  });
});
