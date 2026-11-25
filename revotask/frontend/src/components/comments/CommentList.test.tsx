import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommentList } from "./CommentList";
import type { Comment } from "@/types";

const comment = (id: string, authorId: string, content: string, edited = false): Comment => ({
  id,
  card_id: "card",
  content,
  author: { id: authorId, name: authorId === "me" ? "Me" : "Other" },
  created_at: "2026-01-01T00:00:00+00:00",
  updated_at: edited ? "2026-01-02T00:00:00+00:00" : "2026-01-01T00:00:00+00:00",
});

const noop = () => Promise.resolve();

// REQ-CMT-5: list rendering, owner-only actions, safe text rendering.
describe("CommentList", () => {
  it("shows loading, error and empty states", () => {
    const { rerender } = render(<CommentList comments={[]} currentUserId="me" loading onEdit={noop} onDelete={noop} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading comments");
    rerender(
      <CommentList
        comments={[]}
        currentUserId="me"
        error="Comments could not be loaded."
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
    rerender(<CommentList comments={[]} currentUserId="me" onEdit={noop} onDelete={noop} />);
    expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
  });

  it("offers edit and delete only on the current user's comments", () => {
    render(
      <CommentList
        comments={[comment("1", "me", "mine"), comment("2", "other", "theirs")]}
        currentUserId="me"
        onEdit={noop}
        onDelete={noop}
      />,
    );
    const [mine, theirs] = screen.getAllByRole("listitem");
    expect(within(mine).getByRole("button", { name: /Edit comment: mine/ })).toBeInTheDocument();
    expect(within(mine).getByRole("button", { name: /Delete comment: mine/ })).toBeInTheDocument();
    expect(within(theirs).queryByRole("button")).not.toBeInTheDocument();
  });

  it("edits a comment in place and calls onEdit with the trimmed text", async () => {
    const onEdit = vi.fn(noop);
    render(<CommentList comments={[comment("1", "me", "old")]} currentUserId="me" onEdit={onEdit} onDelete={noop} />);

    await userEvent.click(screen.getByRole("button", { name: /Edit comment: old/ }));
    const field = screen.getByLabelText("Edit comment");
    expect(field).toHaveValue("old");
    await userEvent.clear(field);
    await userEvent.type(field, "  new text  ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onEdit).toHaveBeenCalledWith("1", "new text");
  });

  it("keeps the editor open when saving fails", async () => {
    const onEdit = vi.fn(() => Promise.reject(new Error("403")));
    render(<CommentList comments={[comment("1", "me", "old")]} currentUserId="me" onEdit={onEdit} onDelete={noop} />);

    await userEvent.click(screen.getByRole("button", { name: /Edit comment: old/ }));
    await userEvent.type(screen.getByLabelText("Edit comment"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Edit comment")).toBeInTheDocument();
  });

  it("does not mark a comment edited when its timestamps are equal", () => {
    render(
      <CommentList comments={[comment("1", "me", "fresh", false)]} currentUserId="me" onEdit={noop} onDelete={noop} />,
    );
    expect(screen.queryByText(/edited/)).not.toBeInTheDocument();
  });

  it("cancels editing without calling onEdit", async () => {
    const onEdit = vi.fn(noop);
    render(<CommentList comments={[comment("1", "me", "old")]} currentUserId="me" onEdit={onEdit} onDelete={noop} />);
    await userEvent.click(screen.getByRole("button", { name: /Edit comment: old/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("old")).toBeInTheDocument();
  });

  it("calls onDelete and marks edited comments", async () => {
    const onDelete = vi.fn(noop);
    render(
      <CommentList comments={[comment("1", "me", "bye", true)]} currentUserId="me" onEdit={noop} onDelete={onDelete} />,
    );
    expect(screen.getByText(/edited/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Delete comment: bye/ }));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("renders markup as plain text, never as HTML (FE-11)", () => {
    render(
      <CommentList
        comments={[comment("1", "other", '<img src=x onerror="alert(1)"><b>bold</b>')]}
        currentUserId="me"
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
  });
});
