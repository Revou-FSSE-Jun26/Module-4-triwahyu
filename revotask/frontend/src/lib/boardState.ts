import { sortByOrder } from "./ordering";
import type { Card, Column } from "@/types";

/** Pure board-state transitions. `useDragAndDrop` and BoardView compose these (FE-06). */

export function findCard(columns: Column[], cardId: string): Card | undefined {
  for (const column of columns) {
    const card = column.cards.find((item) => item.id === cardId);
    if (card) return card;
  }
}

/** Remove the card wherever it is, then place `card` into `card.column_id` in sorted position. */
export function placeCard(columns: Column[], card: Card): Column[] {
  return columns.map((column) => {
    const without = column.cards.filter((item) => item.id !== card.id);
    return column.id === card.column_id
      ? { ...column, cards: sortByOrder([...without, card]) }
      : { ...column, cards: without };
  });
}

/** Optimistic move: the same card at a new column and order. */
export function applyMove(columns: Column[], cardId: string, columnId: string, order: number): Column[] {
  const card = findCard(columns, cardId);
  return card ? placeCard(columns, { ...card, column_id: columnId, order }) : columns;
}

export function replaceCard(columns: Column[], card: Card): Column[] {
  return findCard(columns, card.id) ? placeCard(columns, card) : columns;
}

export function removeCard(columns: Column[], cardId: string): Column[] {
  return columns.map((column) => ({ ...column, cards: column.cards.filter((item) => item.id !== cardId) }));
}

export function addCard(columns: Column[], card: Card): Column[] {
  return placeCard(columns, card);
}

/**
 * Index at which a pointer at `clientY` should insert among the cards of a column,
 * ignoring the card being dragged. Dropping above a card's midpoint inserts before it.
 */
export function dropIndexFromPointer(
  rects: { id: string; top: number; height: number }[],
  clientY: number,
  movingId: string,
): number {
  return rects.filter((rect) => rect.id !== movingId && rect.top + rect.height / 2 < clientY).length;
}
