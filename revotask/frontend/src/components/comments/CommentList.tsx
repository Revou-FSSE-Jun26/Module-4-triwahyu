"use client";

import { useState, type FormEvent } from "react";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseTextarea } from "@/components/shared/BaseInput";
import type { Comment } from "@/types";

type Props = {
  comments: Comment[];
  currentUserId: string | null;
  loading?: boolean;
  error?: string | null;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

/** Comments for one card with owner-only edit and delete (REQ-CMT-2/3/4). Content renders as plain text (FE-11). */
export function CommentList({
  comments,
  currentUserId,
  loading = false,
  error = null,
  onEdit,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <p role="status">Loading comments…</p>;
  if (error)
    return (
      <p role="alert" className="font-bold text-danger">
        {error}
      </p>
    );
  if (comments.length === 0)
    return (
      <p className="text-sm text-concrete-700">
        No comments yet. Start the conversation.
      </p>
    );

  async function save(event: FormEvent, id: string) {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await onEdit(id, draft.trim());
      setEditingId(null);
    } catch {
      /* the parent reports the error and keeps the editor open */
    } finally {
      setBusy(false);
    }
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Comments">
      {comments.map((comment) => {
        const mine = comment.author.id === currentUserId;
        const edited = comment.updated_at !== comment.created_at;
        return (
          <li key={comment.id} className="border-2 border-ink bg-white p-3">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-sm">{comment.author.name}</strong>
              <span className="font-mono text-xs text-concrete-700">
                {new Date(comment.created_at).toLocaleString()}
                {edited ? " · edited" : ""}
              </span>
            </div>
            {editingId === comment.id ? (
              <form
                onSubmit={(event) => save(event, comment.id)}
                className="flex flex-col gap-2"
              >
                <BaseTextarea
                  label="Edit comment"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                />
                <div className="flex gap-2">
                  <BaseButton
                    type="submit"
                    size="sm"
                    disabled={busy || !draft.trim()}
                  >
                    Save
                  </BaseButton>
                  <BaseButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </BaseButton>
                </div>
              </form>
            ) : (
              <>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {comment.content}
                </p>
                {mine ? (
                  <div className="mt-2 flex gap-2">
                    <BaseButton
                      size="sm"
                      variant="secondary"
                      aria-label={`Edit comment: ${comment.content.slice(0, 30)}`}
                      onClick={() => {
                        setEditingId(comment.id);
                        setDraft(comment.content);
                      }}
                    >
                      Edit
                    </BaseButton>
                    <BaseButton
                      size="sm"
                      variant="destructive"
                      aria-label={`Delete comment: ${comment.content.slice(0, 30)}`}
                      onClick={() => void onDelete(comment.id)}
                    >
                      Delete
                    </BaseButton>
                  </div>
                ) : null}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
