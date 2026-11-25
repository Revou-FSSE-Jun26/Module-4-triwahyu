// FLOAT ordering strategy shared with the backend (docs/contracts/ordering.md, DB-04).
export const ORDER_STEP = 1024;

type Ordered = { id: string; order: number };

/** The order for an item dropped between `prev` and `next` (either may be absent). */
export function computeOrder(prev?: number, next?: number): number {
  if (prev === undefined && next === undefined) return ORDER_STEP;
  if (prev === undefined) return (next as number) / 2;
  if (next === undefined) return prev + ORDER_STEP;
  return (prev + next) / 2;
}

/** Sort siblings the way the API does: by order, then id for a stable tie-break. */
export function sortByOrder<T extends Ordered>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Order for inserting at `index` among `siblings`, ignoring the item being moved. */
export function orderForIndex(siblings: Ordered[], index: number, movingId?: string): number {
  const others = sortByOrder(siblings.filter((item) => item.id !== movingId));
  const at = Math.max(0, Math.min(index, others.length));
  return computeOrder(others[at - 1]?.order, others[at]?.order);
}
