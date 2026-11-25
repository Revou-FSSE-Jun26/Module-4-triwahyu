"use client";

import { useState, type FormEvent } from "react";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseInput, BaseSelect, BaseTextarea } from "@/components/shared/BaseInput";
import { BaseModal } from "@/components/shared/BaseModal";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { validateRequired } from "@/lib/validation";
import type { Member } from "@/types";

type Props = {
  open: boolean;
  columnName: string;
  members: Member[];
  onClose: () => void;
  onSubmit: (values: { title: string; description: string; assignee_id: string | null }) => Promise<void>;
};

function CardForm({ members, onClose, onSubmit }: Omit<Props, "open" | "columnName">) {
  const handleError = useErrorHandler();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = validateRequired("Title", 200)(title);
    setError(message);
    if (message) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), assignee_id: assignee || null });
      onClose();
    } catch (caught) {
      handleError(caught);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <BaseInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={error} required />
      <BaseTextarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
      <BaseSelect label="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.name}
          </option>
        ))}
      </BaseSelect>
      <div className="flex justify-end gap-3">
        <BaseButton variant="secondary" onClick={onClose}>
          Cancel
        </BaseButton>
        <BaseButton type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add card"}
        </BaseButton>
      </div>
    </form>
  );
}

export function CardFormModal({ open, columnName, onClose, ...form }: Props) {
  return (
    <BaseModal open={open} title={`New card in ${columnName}`} onClose={onClose}>
      <CardForm {...form} onClose={onClose} />
    </BaseModal>
  );
}
