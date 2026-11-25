"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnalyticsModal } from "@/components/board/AnalyticsModal";
import { CardDetailModal } from "@/components/board/CardDetailModal";
import { CardFormModal } from "@/components/board/CardFormModal";
import { CardSearch } from "@/components/board/CardSearch";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { MembersModal } from "@/components/board/MembersModal";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { NameFormModal } from "@/components/shared/NameFormModal";
import { useAuth } from "@/context/AuthContext";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { addCard, findCard, removeCard, replaceCard } from "@/lib/boardState";
import { orderForIndex, sortByOrder } from "@/lib/ordering";
import { notify } from "@/lib/toast";
import type { BoardDetail, Column, Member } from "@/types";

type Dialog =
  | { kind: "addColumn" }
  | { kind: "editColumn"; column: Column }
  | { kind: "deleteColumn"; column: Column }
  | { kind: "addCard"; column: Column }
  | { kind: "renameBoard" }
  | { kind: "deleteBoard" }
  | { kind: "members" }
  | { kind: "analytics" }
  | null;

/** The interactive Kanban board. Rendered by the Server Component page with the fetched board (FE-04). */
export function BoardView({ initial }: { initial: BoardDetail }) {
  const router = useRouter();
  const { api, user } = useAuth();
  const handleError = useErrorHandler();
  const isAdmin = initial.role === "admin";

  const [name, setName] = useState(initial.name);
  const [columns, setColumns] = useState<Column[]>(initial.columns);
  const [members, setMembers] = useState<Member[]>(initial.members);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // router.refresh() delivers a fresh `initial`; adopt it (used after a server-side rebalance).
  useEffect(() => {
    setName(initial.name);
    setColumns(initial.columns);
    setMembers(initial.members);
  }, [initial]);

  const persistMove = useCallback((id: string, body: { column_id: string; order: number }) => api.cards.move(id, body), [api]);
  const refresh = useCallback(() => router.refresh(), [router]);
  const dnd = useDragAndDrop({ columns, setColumns, persistMove, onError: handleError, onRebalanced: refresh });

  const sorted = sortByOrder(columns);
  const selectedCard = selectedCardId ? (findCard(columns, selectedCardId) ?? null) : null;
  const close = () => setDialog(null);

  async function moveColumn(column: Column, direction: -1 | 1) {
    const index = sorted.findIndex((item) => item.id === column.id);
    const order = orderForIndex(sorted, direction === -1 ? index - 1 : index + 1, column.id);
    const previous = columns;
    setColumns((state) => state.map((item) => (item.id === column.id ? { ...item, order } : item)));
    try {
      await api.columns.reorder(initial.id, [{ id: column.id, order }]);
    } catch (error) {
      setColumns(previous); // roll back the optimistic reorder
      handleError(error);
    }
  }

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-black tracking-tight sm:text-4xl">{name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <BaseBadge color={isAdmin ? "orange" : "gray"}>{initial.role}</BaseBadge>
            <span className="font-mono text-xs text-concrete-700">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <CardSearch boardId={initial.id} onSelect={setSelectedCardId} />
          <BaseButton variant="secondary" onClick={() => setDialog({ kind: "members" })}>
            Members
          </BaseButton>
          {isAdmin ? (
            <>
              <BaseButton variant="secondary" onClick={() => setDialog({ kind: "analytics" })}>
                Analytics
              </BaseButton>
              <BaseButton variant="secondary" onClick={() => setDialog({ kind: "renameBoard" })}>
                Rename
              </BaseButton>
              <BaseButton variant="destructive" onClick={() => setDialog({ kind: "deleteBoard" })}>
                Delete board
              </BaseButton>
            </>
          ) : null}
        </div>
      </div>

      {/* The board scrolls inside this container; the page itself never scrolls sideways (FE-10). */}
      <div className="-mx-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:px-0">
        <div className="flex min-h-[28rem] snap-x snap-mandatory items-start gap-5 pb-3 sm:snap-none">
          {sorted.map((column, index) => (
            <KanbanColumn
              key={column.id}
              column={{ ...column, cards: column.cards }}
              isAdmin={isAdmin}
              isDropTarget={dnd.overColumnId === column.id}
              draggingId={dnd.draggingId}
              dropProps={dnd.getColumnProps(column.id)}
              getCardProps={dnd.getCardProps}
              onOpenCard={setSelectedCardId}
              onAddCard={(target) => setDialog({ kind: "addCard", column: target })}
              onEdit={(target) => setDialog({ kind: "editColumn", column: target })}
              onDelete={(target) => setDialog({ kind: "deleteColumn", column: target })}
              onMove={moveColumn}
              canMoveLeft={index > 0}
              canMoveRight={index < sorted.length - 1}
            />
          ))}
          <BaseButton variant="secondary" className="w-44 shrink-0" onClick={() => setDialog({ kind: "addColumn" })}>
            + Add column
          </BaseButton>
        </div>
      </div>

      <NameFormModal
        open={dialog?.kind === "addColumn"}
        title="Add a column"
        label="Column name"
        submitLabel="Add column"
        checkboxLabel="Cards in this column count as done"
        onClose={close}
        onSubmit={async ({ name: columnName, checked }) => {
          const created = await api.columns.create(initial.id, { name: columnName, is_done: checked });
          setColumns((state) => [...state, { ...created, cards: [] }]);
        }}
      />
      {dialog?.kind === "editColumn" ? (
        <NameFormModal
          open
          title="Edit column"
          label="Column name"
          submitLabel="Save column"
          initialValue={dialog.column.name}
          checkboxLabel="Cards in this column count as done"
          initialChecked={dialog.column.is_done}
          onClose={close}
          onSubmit={async ({ name: columnName, checked }) => {
            const updated = await api.columns.update(dialog.column.id, { name: columnName, is_done: checked });
            setColumns((state) => state.map((item) => (item.id === updated.id ? { ...item, name: updated.name, is_done: updated.is_done } : item)));
          }}
        />
      ) : null}
      <ConfirmModal
        open={dialog?.kind === "deleteColumn"}
        title="Delete column?"
        message={`“${dialog?.kind === "deleteColumn" ? dialog.column.name : ""}” and every card in it will be removed.`}
        confirmLabel="Delete column"
        onClose={close}
        onConfirm={async () => {
          if (dialog?.kind !== "deleteColumn") return;
          await api.columns.remove(dialog.column.id);
          setColumns((state) => state.filter((item) => item.id !== dialog.column.id));
          notify.success("Column deleted.");
        }}
      />
      <CardFormModal
        open={dialog?.kind === "addCard"}
        columnName={dialog?.kind === "addCard" ? dialog.column.name : ""}
        members={members}
        onClose={close}
        onSubmit={async (values) => {
          if (dialog?.kind !== "addCard") return;
          const card = await api.cards.create(dialog.column.id, {
            title: values.title,
            assignee_id: values.assignee_id,
            ...(values.description ? { description: values.description } : {}),
          });
          setColumns((state) => addCard(state, card));
        }}
      />
      <NameFormModal
        open={dialog?.kind === "renameBoard"}
        title="Rename board"
        label="Board name"
        submitLabel="Save name"
        initialValue={name}
        onClose={close}
        onSubmit={async ({ name: next }) => setName((await api.boards.rename(initial.id, next)).name)}
      />
      <ConfirmModal
        open={dialog?.kind === "deleteBoard"}
        title="Delete board?"
        message={`“${name}” with all of its columns, cards and comments will be removed for everyone.`}
        confirmLabel="Delete board"
        onClose={close}
        onConfirm={async () => {
          await api.boards.remove(initial.id);
          notify.success("Board deleted.");
          router.push("/");
        }}
      />
      <MembersModal
        open={dialog?.kind === "members"}
        boardId={initial.id}
        members={members}
        isAdmin={isAdmin}
        currentUserId={user?.id ?? null}
        onClose={close}
        onChange={setMembers}
      />
      <AnalyticsModal open={dialog?.kind === "analytics"} boardId={initial.id} onClose={close} />
      <CardDetailModal
        card={selectedCard}
        columns={sorted}
        members={members}
        onClose={() => setSelectedCardId(null)}
        onUpdated={(card) => setColumns((state) => replaceCard(state, card))}
        onDeleted={(id) => setColumns((state) => removeCard(state, id))}
        onMoveToColumn={dnd.moveToColumn}
      />
    </main>
  );
}
