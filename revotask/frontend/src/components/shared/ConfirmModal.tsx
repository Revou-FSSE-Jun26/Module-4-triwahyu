"use client";

import { useState } from "react";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseModal } from "@/components/shared/BaseModal";
import { useErrorHandler } from "@/hooks/useErrorHandler";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

/** Confirmation dialog for destructive actions. Rendered inside BaseModal (FE-03). */
export function ConfirmModal({ open, title, message, confirmLabel, onClose, onConfirm }: Props) {
  const handleError = useErrorHandler();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BaseModal open={open} title={title} onClose={onClose}>
      <p className="mb-6 text-sm">{message}</p>
      <div className="flex justify-end gap-3">
        <BaseButton variant="secondary" onClick={onClose}>
          Cancel
        </BaseButton>
        <BaseButton variant="destructive" disabled={busy} onClick={() => void confirm()}>
          {busy ? "Working…" : confirmLabel}
        </BaseButton>
      </div>
    </BaseModal>
  );
}
