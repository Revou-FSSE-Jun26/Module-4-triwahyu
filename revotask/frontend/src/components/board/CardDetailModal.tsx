"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CommentList } from "@/components/comments/CommentList";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseInput, BaseSelect, BaseTextarea } from "@/components/shared/BaseInput";
import { BaseModal } from "@/components/shared/BaseModal";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { notify } from "@/lib/toast";
import { validateRequired } from "@/lib/validation";
import type { Card, Column, Comment, Member } from "@/types";

type Props = {
  card: Card | null;
  columns: Column[];
  members: Member[];
  onClose: () => void;
  onUpdated: (card: Card) => void;
  onDeleted: (cardId: string) => void;
  onMoveToColumn: (cardId: string, columnId: string) => Promise<void>;
};

/** Card details, move alternative, and comments. Composes CommentList inside BaseModal (REQ-CMT-5). */
export function CardDetailModal({ card, columns, members, onClose, onUpdated, onDeleted, onMoveToColumn }: Props) {
  return (
    <BaseModal open={card !== null} title="Card details" onClose={onClose} wide>
      {card ? (
        <CardDetailBody
          key={card.id}
          card={card}
          columns={columns}
          members={members}
          onClose={onClose}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
          onMoveToColumn={onMoveToColumn}
        />
      ) : null}
    </BaseModal>
  );
}

function CardDetailBody({
  card,
  columns,
  members,
  onClose,
  onUpdated,
  onDeleted,
  onMoveToColumn,
}: Props & { card: Card }) {
  const { api, user } = useAuth();
  const handleError = useErrorHandler();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [assignee, setAssignee] = useState(card.assignee?.id ?? "");
  const [titleError, setTitleError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      setComments(await api.comments.list(card.id));
      setCommentsError(null);
    } catch {
      setCommentsError("Comments could not be loaded.");
    } finally {
      setCommentsLoading(false);
    }
  }, [api, card.id]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const dirty =
    title.trim() !== card.title ||
    description.trim() !== (card.description ?? "") ||
    assignee !== (card.assignee?.id ?? "");

  async function save(event: FormEvent) {
    event.preventDefault();
    const message = validateRequired("Title", 200)(title);
    setTitleError(message);
    if (message) return;
    setSaving(true);
    try {
      onUpdated(
        await api.cards.update(card.id, {
          title: title.trim(),
          description: description.trim() || null,
          assignee_id: assignee || null,
        }),
      );
      notify.success("Card saved.");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }

  async function postComment(event: FormEvent) {
    event.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const created = await api.comments.create(card.id, newComment.trim());
      setComments((current) => [...current, created]);
      setNewComment("");
    } catch (error) {
      handleError(error);
    } finally {
      setPosting(false);
    }
  }

  async function editComment(id: string, content: string) {
    try {
      const updated = await api.comments.update(id, content);
      setComments((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      handleError(error);
      throw error; // keeps the editor open
    }
  }

  async function deleteComment(id: string) {
    try {
      await api.comments.remove(id);
      setComments((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      handleError(error);
    }
  }

  async function deleteCard() {
    try {
      await api.cards.remove(card.id);
      onDeleted(card.id);
      onClose();
      notify.success("Card deleted.");
    } catch (error) {
      handleError(error);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <BaseInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={titleError} required />
        <BaseTextarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <BaseSelect label="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.name}
              </option>
            ))}
          </BaseSelect>
          <BaseSelect
            label="Move to column"
            value={card.column_id}
            onChange={(e) => void onMoveToColumn(card.id, e.target.value)}
            hint="Keyboard and touch alternative to dragging."
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </BaseSelect>
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          {confirmDelete ? (
            <div className="flex gap-2">
              <BaseButton variant="destructive" onClick={() => void deleteCard()}>
                Confirm delete
              </BaseButton>
              <BaseButton variant="secondary" onClick={() => setConfirmDelete(false)}>
                Keep card
              </BaseButton>
            </div>
          ) : (
            <BaseButton variant="secondary" onClick={() => setConfirmDelete(true)}>
              Delete card
            </BaseButton>
          )}
          <BaseButton type="submit" disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save changes"}
          </BaseButton>
        </div>
      </form>

      <section aria-labelledby={`comments-${card.id}`} className="border-t-3 border-ink pt-4">
        <h3 id={`comments-${card.id}`} className="mb-3 text-lg font-extrabold">
          Comments
        </h3>
        <CommentList
          comments={comments}
          currentUserId={user?.id ?? null}
          loading={commentsLoading}
          error={commentsError}
          onEdit={editComment}
          onDelete={deleteComment}
        />
        <form onSubmit={postComment} className="mt-4 flex flex-col gap-3">
          <BaseTextarea
            label="Add a comment"
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={2000}
          />
          <div className="flex justify-end">
            <BaseButton type="submit" disabled={posting || !newComment.trim()}>
              {posting ? "Posting…" : "Post comment"}
            </BaseButton>
          </div>
        </form>
      </section>
    </div>
  );
}
