import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDragAndDrop } from "./useDragAndDrop";
import { ApiError } from "@/lib/errors";
import type { Card, Column, MoveResult } from "@/types";

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

const initial = (): Column[] => [
  { id: "todo", board_id: "b", name: "To Do", order: 1024, is_done: false, cards: [card("a", "todo", 1024), card("b", "todo", 2048)] },
  { id: "done", board_id: "b", name: "Done", order: 2048, is_done: true, cards: [] },
];

function setup(persistMove: (id: string, body: { column_id: string; order: number }) => Promise<MoveResult>) {
  const onError = vi.fn();
  const onRebalanced = vi.fn();
  const hook = renderHook(() => {
    const [columns, setColumns] = useState<Column[]>(initial());
    return { columns, ...useDragAndDrop({ columns, setColumns, persistMove, onError, onRebalanced }) };
  });
  const ids = (columnId: string) => hook.result.current.columns.find((c) => c.id === columnId)!.cards.map((c) => c.id);
  return { hook, onError, onRebalanced, ids };
}

// REQ-CARD-9: optimistic native drag-and-drop with rollback.
describe("useDragAndDrop", () => {
  it("moves the card at once, persists column and order, then keeps the server's card", async () => {
    let finish!: (value: MoveResult) => void;
    const persist = vi.fn(() => new Promise<MoveResult>((resolve) => (finish = resolve)));
    const { hook, ids } = setup(persist);

    act(() => void hook.result.current.moveCardTo("a", "done", 0));

    // Optimistic: the UI changed before the API answered.
    expect(ids("todo")).toEqual(["b"]);
    expect(ids("done")).toEqual(["a"]);
    expect(persist).toHaveBeenCalledWith("a", { column_id: "done", order: 1024 });

    await act(async () => finish({ card: { ...card("a", "done", 1024), title: "from server" }, rebalanced: false }));
    expect(hook.result.current.columns[1].cards[0].title).toBe("from server");
  });

  // REQ-NFR-2: a failed optimistic move is rolled back.
  it("reverts to the original column and position when the API rejects the move", async () => {
    const persist = vi.fn(() => Promise.reject(new ApiError("Forbidden", 403)));
    const { hook, ids, onError } = setup(persist);

    await act(async () => hook.result.current.moveCardTo("a", "done", 0));

    expect(ids("todo")).toEqual(["a", "b"]);
    expect(ids("done")).toEqual([]);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("asks the board to refresh when the server rebalanced the column", async () => {
    const persist = vi.fn(async (id: string): Promise<MoveResult> => ({ card: card(id, "done", 1024), rebalanced: true }));
    const { hook, onRebalanced } = setup(persist);

    await act(async () => hook.result.current.moveCardTo("a", "done", 0));

    await waitFor(() => expect(onRebalanced).toHaveBeenCalledTimes(1));
  });

  it("does not call the API when a card is dropped where it already is", async () => {
    const persist = vi.fn();
    const { hook } = setup(persist);

    await act(async () => hook.result.current.moveCardTo("a", "todo", 0));

    expect(persist).not.toHaveBeenCalled();
  });

  it("moveToColumn appends to the end of the target column (keyboard/touch alternative)", async () => {
    const persist = vi.fn(async (id: string, body: { column_id: string; order: number }): Promise<MoveResult> => ({
      card: card(id, body.column_id, body.order),
      rebalanced: false,
    }));
    const { hook, ids } = setup(persist);

    await act(async () => hook.result.current.moveToColumn("b", "done"));

    expect(ids("done")).toEqual(["b"]);
    expect(persist).toHaveBeenCalledWith("b", { column_id: "done", order: 1024 });
  });

  it("exposes draggable card props that record the dragged id", () => {
    const { hook } = setup(vi.fn());
    const setData = vi.fn();

    act(() =>
      hook.result.current.getCardProps("a").onDragStart({ dataTransfer: { setData, effectAllowed: "" } } as never),
    );

    expect(hook.result.current.getCardProps("a").draggable).toBe(true);
    expect(setData).toHaveBeenCalledWith("text/plain", "a");
    expect(hook.result.current.draggingId).toBe("a");
  });
});
