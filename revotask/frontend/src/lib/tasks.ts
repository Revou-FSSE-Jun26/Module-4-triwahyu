import type { TaskCard } from "@/types";

export type BoardGroup = { boardId: string; boardName: string; cards: TaskCard[] };

/** Group cards by board for My Tasks. Boards are sorted by name; cards keep the API order. */
export function groupByBoard(cards: TaskCard[]): BoardGroup[] {
  const groups = new Map<string, BoardGroup>();
  for (const card of cards) {
    const group = groups.get(card.board.id) ?? { boardId: card.board.id, boardName: card.board.name, cards: [] };
    group.cards.push(card);
    groups.set(card.board.id, group);
  }
  return [...groups.values()].sort((a, b) => a.boardName.localeCompare(b.boardName));
}
