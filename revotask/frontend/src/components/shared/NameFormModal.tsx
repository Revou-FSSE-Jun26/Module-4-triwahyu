"use client";

import { useState, type FormEvent } from "react";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseInput } from "@/components/shared/BaseInput";
import { BaseModal } from "@/components/shared/BaseModal";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { isApiError } from "@/lib/errors";
import { validateRequired } from "@/lib/validation";

export type NameFormValues = { name: string; checked: boolean };

type Props = {
  open: boolean;
  title: string;
  label: string;
  submitLabel: string;
  maxLength?: number;
  initialValue?: string;
  checkboxLabel?: string;
  initialChecked?: boolean;
  onClose: () => void;
  /** Resolve to close the dialog; throw to keep it open and report the error. */
  onSubmit: (values: NameFormValues) => Promise<void>;
};

function NameForm({ label, submitLabel, maxLength = 100, initialValue = "", checkboxLabel, initialChecked = false, onClose, onSubmit }: Omit<Props, "open" | "title">) {
  const handleError = useErrorHandler();
  const [name, setName] = useState(initialValue);
  const [checked, setChecked] = useState(initialChecked);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const validate = validateRequired(label, maxLength);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = validate(name);
    setError(message);
    if (message) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), checked });
      onClose();
    } catch (caught) {
      if (isApiError(caught) && caught.details?.name) setError(caught.details.name[0]);
      else handleError(caught);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <BaseInput label={label} value={name} onChange={(e) => setName(e.target.value)} error={error} maxLength={maxLength + 50} required />
      {checkboxLabel ? (
        <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
          <input type="checkbox" className="h-5 w-5 accent-signal-500" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          {checkboxLabel}
        </label>
      ) : null}
      <div className="flex justify-end gap-3">
        <BaseButton variant="secondary" onClick={onClose}>
          Cancel
        </BaseButton>
        <BaseButton type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </BaseButton>
      </div>
    </form>
  );
}

/** A dialog with one required text field and an optional checkbox. */
export function NameFormModal({ open, title, onClose, ...form }: Props) {
  return (
    <BaseModal open={open} title={title} onClose={onClose}>
      <NameForm {...form} onClose={onClose} />
    </BaseModal>
  );
}
