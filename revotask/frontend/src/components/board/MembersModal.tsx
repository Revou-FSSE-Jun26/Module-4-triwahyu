"use client";

import { useState, type FormEvent } from "react";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseInput, BaseSelect } from "@/components/shared/BaseInput";
import { BaseModal } from "@/components/shared/BaseModal";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { isApiError } from "@/lib/errors";
import { notify } from "@/lib/toast";
import { validateEmail } from "@/lib/validation";
import type { Member, Role } from "@/types";

type Props = {
  open: boolean;
  boardId: string;
  members: Member[];
  isAdmin: boolean;
  currentUserId: string | null;
  onClose: () => void;
  onChange: (members: Member[]) => void;
};

/** Lists board members; admins can add by email, change roles and remove members (REQ-BOARD-6). */
export function MembersModal({ open, boardId, members, isAdmin, currentUserId, onClose, onChange }: Props) {
  const { api } = useAuth();
  const handleError = useErrorHandler();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [emailError, setEmailError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    const message = validateEmail(email);
    setEmailError(message);
    if (message) return;
    setBusy(true);
    try {
      const added = await api.boards.addMember(boardId, { email: email.trim(), role });
      onChange([...members, added]);
      setEmail("");
      notify.success(`${added.name} was added to the board.`);
    } catch (error) {
      if (isApiError(error) && [404, 409].includes(error.statusCode)) setEmailError(error.message);
      else handleError(error);
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(member: Member, next: Role) {
    try {
      const updated = await api.boards.setMemberRole(boardId, member.user_id, next);
      onChange(members.map((item) => (item.user_id === member.user_id ? updated : item)));
    } catch (error) {
      handleError(error);
    }
  }

  async function remove(member: Member) {
    try {
      await api.boards.removeMember(boardId, member.user_id);
      onChange(members.filter((item) => item.user_id !== member.user_id));
    } catch (error) {
      handleError(error);
    }
  }

  return (
    <BaseModal open={open} title="Board members" onClose={onClose}>
      <ul className="mb-6 flex flex-col gap-2" aria-label="Members">
        {members.map((member) => (
          <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 border-2 border-ink bg-white p-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{member.name}</p>
              <p className="truncate font-mono text-xs text-concrete-700">{member.email}</p>
            </div>
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <select
                  aria-label={`Role for ${member.name}`}
                  className="min-h-11 rounded-md border-2 border-ink bg-well px-2 text-sm"
                  value={member.role}
                  onChange={(e) => void changeRole(member, e.target.value as Role)}
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
                <BaseButton variant="destructive" size="sm" aria-label={`Remove ${member.name}`} disabled={member.user_id === currentUserId} onClick={() => void remove(member)}>
                  Remove
                </BaseButton>
              </div>
            ) : (
              <BaseBadge color={member.role === "admin" ? "orange" : "gray"}>{member.role}</BaseBadge>
            )}
          </li>
        ))}
      </ul>

      {isAdmin ? (
        <form onSubmit={add} noValidate className="flex flex-col gap-3 border-t-3 border-ink pt-4">
          <BaseInput label="Add member by email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} hint="They must already have a RevoTask account." />
          <BaseSelect label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </BaseSelect>
          <BaseButton type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add member"}
          </BaseButton>
        </form>
      ) : (
        <p className="text-sm text-concrete-700">Only board admins can change membership.</p>
      )}
    </BaseModal>
  );
}
