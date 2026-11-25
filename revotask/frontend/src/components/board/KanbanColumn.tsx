"use client";

import type { DragEvent } from "react";
import { KanbanCard } from "@/components/board/KanbanCard";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import type { Column } from "@/types";

type DropProps = {
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragEnter: () => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

type Props = {
  column: Column;
  isAdmin: boolean;
  isDropTarget: boolean;
  draggingId: string | null;
  dropProps: DropProps;
  getCardProps: (cardId: string) => React.ComponentProps<typeof KanbanCard>["dragProps"];
  onOpenCard: (cardId: string) => void;
  onAddCard: (column: Column) => void;
  onEdit: (column: Column) => void;
  onDelete: (column: Column) => void;
  onMove: (column: Column, direction: -1 | 1) => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
};

/** One Kanban column. The whole section is a drop target for cards (REQ-CARD-9). */
export function KanbanColumn(props: Props) {
  const { column, isAdmin, isDropTarget, draggingId, dropProps, getCardProps, onOpenCard } = props;

  return (
    <section
      aria-label={`Column: ${column.name}`}
      {...dropProps}
      className={`flex max-h-full w-72 shrink-0 snap-center flex-col border-3 border-ink bg-concrete-200 shadow-hard sm:w-80 ${
        isDropTarget ? "outline outline-4 outline-offset-2 outline-signal-500" : ""
      }`}
    >
      {/* Two rows: the title gets the full width so it never wraps mid-word; controls sit underneath. */}
      <header className="border-b-3 border-ink bg-paper p-3">
        <h2 className="break-words text-base font-black leading-tight">{column.name}</h2>
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <BaseBadge>{column.cards.length}</BaseBadge>
            {column.is_done ? <BaseBadge color="green">done</BaseBadge> : null}
          </div>
          <div className="-ml-2 flex items-center">
            <BaseButton
              variant="ghost"
              size="icon"
              aria-label={`Move column ${column.name} left`}
              disabled={!props.canMoveLeft}
              onClick={() => props.onMove(column, -1)}
            >
              ◀
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="icon"
              aria-label={`Move column ${column.name} right`}
              disabled={!props.canMoveRight}
              onClick={() => props.onMove(column, 1)}
            >
              ▶
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="sm"
              aria-label={`Edit column ${column.name}`}
              onClick={() => props.onEdit(column)}
            >
              Edit
            </BaseButton>
            {isAdmin ? (
              <BaseButton
                variant="ghost"
                size="sm"
                aria-label={`Delete column ${column.name}`}
                onClick={() => props.onDelete(column)}
              >
                Delete
              </BaseButton>
            ) : null}
          </div>
        </div>
      </header>

      <div data-card-list className="flex min-h-24 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {column.cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            dragging={draggingId === card.id}
            dragProps={getCardProps(card.id)}
            onOpen={onOpenCard}
          />
        ))}
        {column.cards.length === 0 ? (
          <p className="py-4 text-center text-xs text-concrete-700">Drop cards here</p>
        ) : null}
      </div>

      <footer className="border-t-3 border-ink p-3">
        <BaseButton variant="secondary" size="sm" className="w-full" onClick={() => props.onAddCard(column)}>
          + Add card
        </BaseButton>
      </footer>
    </section>
  );
}
