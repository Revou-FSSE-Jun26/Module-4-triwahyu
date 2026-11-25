"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react";
import {
  applyMove,
  dropIndexFromPointer,
  findCard,
  placeCard,
  replaceCard,
} from "@/lib/boardState";
import { orderForIndex, sortByOrder } from "@/lib/ordering";
import type { Column, MoveResult } from "@/types";

type Options = {
  columns: Column[];
  setColumns: Dispatch<SetStateAction<Column[]>>;
  /** Calls PATCH /api/cards/<id>/position. */
  persistMove: (
    cardId: string,
    body: { column_id: string; order: number },
  ) => Promise<MoveResult>;
  onError: (error: unknown) => void;
  /** The server renumbered the column, so local float orders are stale. */
  onRebalanced?: () => void;
};

/**
 * Native HTML5 drag-and-drop for cards (REQ-CARD-9).
 * Moves are optimistic: the card jumps immediately, and goes back to its original column and
 * position if the API rejects the move (FE-06).
 */
export function useDragAndDrop({
  columns,
  setColumns,
  persistMove,
  onError,
  onRebalanced,
}: Options) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const columnsRef = useRef(columns);
  const draggingRef = useRef<string | null>(null);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const moveCardTo = useCallback(
    async (cardId: string, targetColumnId: string, index: number) => {
      const current = columnsRef.current;
      const original = findCard(current, cardId);
      const target = current.find((column) => column.id === targetColumnId);
      if (!original || !target) return;

      const currentIndex = sortByOrder(target.cards).findIndex(
        (card) => card.id === cardId,
      );
      if (original.column_id === targetColumnId && currentIndex === index)
        return; // dropped where it was

      const order = orderForIndex(target.cards, index, cardId);
      setColumns((state) => applyMove(state, cardId, targetColumnId, order)); // optimistic update

      try {
        const result = await persistMove(cardId, {
          column_id: targetColumnId,
          order,
        });
        setColumns((state) => replaceCard(state, result.card));
        if (result.rebalanced) onRebalanced?.();
      } catch (error) {
        setColumns((state) => placeCard(state, original)); // revert to the original position
        onError(error);
      }
    },
    [setColumns, persistMove, onError, onRebalanced],
  );

  /** Keyboard and touch alternative to dragging: append to the end of another column. */
  const moveToColumn = useCallback(
    (cardId: string, columnId: string) => {
      const target = columnsRef.current.find(
        (column) => column.id === columnId,
      );
      return moveCardTo(cardId, columnId, target?.cards.length ?? 0);
    },
    [moveCardTo],
  );

  const clear = () => {
    draggingRef.current = null;
    setDraggingId(null);
    setOverColumnId(null);
  };

  const getCardProps = (cardId: string) => ({
    draggable: true as const,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.setData("text/plain", cardId);
      event.dataTransfer.effectAllowed = "move";
      draggingRef.current = cardId;
      setDraggingId(cardId);
    },
    onDragEnd: clear,
  });

  const getColumnProps = (columnId: string) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!draggingRef.current) return;
      event.preventDefault(); // marks this element as a valid drop target
      event.dataTransfer.dropEffect = "move";
    },
    onDragEnter: () => {
      if (draggingRef.current) setOverColumnId(columnId);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setOverColumnId((id) => (id === columnId ? null : id));
      }
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      const cardId =
        draggingRef.current ?? event.dataTransfer.getData("text/plain");
      const rects = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>("[data-card-id]"),
      ).map((el) => {
        const box = el.getBoundingClientRect();
        return {
          id: el.dataset.cardId ?? "",
          top: box.top,
          height: box.height,
        };
      });
      const index = dropIndexFromPointer(rects, event.clientY, cardId);
      clear();
      if (cardId) void moveCardTo(cardId, columnId, index);
    },
  });

  return {
    draggingId,
    overColumnId,
    getCardProps,
    getColumnProps,
    moveToColumn,
    moveCardTo,
  };
}
