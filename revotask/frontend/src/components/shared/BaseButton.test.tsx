import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BaseButton } from "./BaseButton";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const justifyClasses = (element: HTMLElement) => element.className.split(/\s+/).filter((name) => name.startsWith("justify-"));

// REQ-FND-6 / R15: alignment is a prop. Passing it through className conflicted with the base class and was ignored.
describe("BaseButton alignment", () => {
  it("centers by default", () => {
    render(<BaseButton>Go</BaseButton>);
    expect(justifyClasses(screen.getByRole("button"))).toEqual(["justify-center"]);
  });

  it.each([
    ["start", "justify-start"],
    ["between", "justify-between"],
    ["center", "justify-center"],
  ] as const)("align=%s applies exactly one justify class", (align, expected) => {
    render(<BaseButton align={align}>Go</BaseButton>);
    expect(justifyClasses(screen.getByRole("button"))).toEqual([expected]);
  });

  it("applies the same alignment to link buttons", () => {
    render(
      <BaseButton href="/x" align="start">
        Go
      </BaseButton>,
    );
    expect(justifyClasses(screen.getByRole("link"))).toEqual(["justify-start"]);
  });

  it("offers a card size that still meets the 44px target", () => {
    render(<BaseButton size="card">Title</BaseButton>);
    expect(screen.getByRole("button")).toHaveClass("min-h-11");
  });
});
