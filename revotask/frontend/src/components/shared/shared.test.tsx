import { render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BaseBadge } from "./BaseBadge";
import { BaseButton } from "./BaseButton";
import { BaseModal } from "./BaseModal";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// REQ-FND-6: shared components used by every page and form.
describe("BaseButton", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    render(<BaseButton>Cancel</BaseButton>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("type", "button");
  });

  it("does not submit the surrounding form unless type=submit", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <BaseButton>Cancel</BaseButton>
        <BaseButton type="submit">Save</BaseButton>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["primary", "bg-key"],
    ["secondary", "bg-paper"],
    ["destructive", "bg-danger"],
  ] as const)("renders the %s variant", (variant, expectedClass) => {
    render(<BaseButton variant={variant}>Go</BaseButton>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass(expectedClass);
  });

  it("keeps a 44px minimum hit target in every size", () => {
    render(
      <>
        <BaseButton size="md">M</BaseButton>
        <BaseButton size="sm">S</BaseButton>
        <BaseButton size="icon">I</BaseButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "M" })).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "S" })).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "I" })).toHaveClass("h-11", "w-11");
  });

  it("forwards disabled and click handlers", async () => {
    const onClick = vi.fn();
    render(
      <BaseButton disabled onClick={onClick}>
        Nope
      </BaseButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Nope" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders a link when href is provided", () => {
    render(<BaseButton href="/boards/1">Open</BaseButton>);
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/boards/1");
  });
});

describe("BaseBadge", () => {
  it.each([
    ["gray", "bg-paper"],
    ["orange", "bg-signal-300"],
    ["green", "bg-success"],
    ["red", "bg-danger"],
    ["yellow", "bg-tag"],
  ] as const)("renders the %s color", (color, expectedClass) => {
    render(<BaseBadge color={color}>label</BaseBadge>);
    expect(screen.getByText("label")).toHaveClass(expectedClass);
  });
});

describe("BaseModal", () => {
  it("renders nothing while closed", () => {
    render(
      <BaseModal open={false} title="Hidden" onClose={vi.fn()}>
        body
      </BaseModal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is an accessible dialog labelled by its title", () => {
    render(
      <BaseModal open title="Create a board" onClose={vi.fn()}>
        body
      </BaseModal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Create a board" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape and on the close button", async () => {
    const onClose = vi.fn();
    render(
      <BaseModal open title="T" onClose={onClose}>
        body
      </BaseModal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("gives two open dialogs different title ids (the scaffold hard-coded one id)", () => {
    render(
      <>
        <BaseModal open title="One" onClose={vi.fn()}>
          a
        </BaseModal>
        <BaseModal open title="Two" onClose={vi.fn()}>
          b
        </BaseModal>
      </>,
    );
    const [first, second] = screen.getAllByRole("dialog");
    expect(first.getAttribute("aria-labelledby")).not.toBe(second.getAttribute("aria-labelledby"));
  });

  it("moves focus into the dialog and returns it to the opener on close", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <BaseModal open={open} title="T" onClose={() => setOpen(false)}>
            <input aria-label="Name" />
          </BaseModal>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await userEvent.click(opener);
    expect(screen.getByLabelText("Name")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(opener).toHaveFocus();
  });

  it("keeps the title and close button outside the scrolling body (they must never scroll away)", () => {
    render(
      <BaseModal open title="Card details" onClose={vi.fn()}>
        <p>long content</p>
      </BaseModal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Card details" });
    const body = screen.getByText("long content").parentElement as HTMLElement;
    expect(body).toHaveClass("overflow-y-auto");
    expect(dialog).not.toHaveClass("overflow-y-auto");
    expect(body).not.toContainElement(screen.getByRole("heading", { name: "Card details" }));
    expect(body).not.toContainElement(screen.getByRole("button", { name: "Close dialog" }));
  });

  it("locks page scroll while open and restores it after", () => {
    const { rerender } = render(
      <BaseModal open title="T" onClose={vi.fn()}>
        b
      </BaseModal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <BaseModal open={false} title="T" onClose={vi.fn()}>
        b
      </BaseModal>,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
