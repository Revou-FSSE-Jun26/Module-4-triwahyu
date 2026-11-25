"use client";

import type { DragEvent } from "react";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import type { Card } from "@/types";

type DragProps = {
  draggable: true;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
};

type Props = { card: Card; dragging: boolean; dragProps: DragProps; onOpen: (cardId: string) => void };

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function KanbanCard({ card, dragging, dragProps, onOpen }: Props) {
  return (
    <article
      data-card-id={card.id}
      aria-label={`Card: ${card.title}`}
      {...dragProps}
      className={`cursor-grab border-3 border-ink bg-paper p-2 shadow-hard-sm active:cursor-grabbing ${dragging ? "opacity-40" : ""}`}
    >
      <BaseButton
        variant="ghost" size="card" align="start" className="w-full whitespace-normal break-words"
        onClick={() => onOpen(card.id)}
      >
        {card.title}
      </BaseButton>
      {card.description || card.assignee ? (
        <div className="mt-1 flex items-center justify-between gap-2 px-2 pb-1">
          <p className="line-clamp-1 min-w-0 flex-1 text-xs text-concrete-700">{card.description}</p>
          {card.assignee ? (
            <span title={`Assigned to ${card.assignee.name}`}>
              <BaseBadge color="orange">{initials(card.assignee.name)}</BaseBadge>
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
