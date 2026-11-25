"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BaseButton } from "@/components/shared/BaseButton";
import { NameFormModal } from "@/components/shared/NameFormModal";
import { useAuth } from "@/context/AuthContext";
import { notify } from "@/lib/toast";

export function CreateBoardButton() {
  const router = useRouter();
  const { api } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <BaseButton onClick={() => setOpen(true)}>New board</BaseButton>
      <NameFormModal
        open={open}
        title="Create a board"
        label="Board name"
        submitLabel="Create board"
        onClose={() => setOpen(false)}
        onSubmit={async ({ name }) => {
          const board = await api.boards.create(name);
          notify.success(`Board “${board.name}” created.`);
          router.push(`/boards/${board.id}`);
        }}
      />
    </>
  );
}
