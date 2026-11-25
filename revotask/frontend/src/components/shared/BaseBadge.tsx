import type { ReactNode } from "react";

export type BadgeColor = "gray" | "orange" | "green" | "red" | "yellow";

type Props = { children: ReactNode; color?: BadgeColor; className?: string };

const colors: Record<BadgeColor, string> = {
  gray: "bg-paper text-ink",
  orange: "bg-signal-300 text-ink",
  green: "bg-success text-paper",
  red: "bg-danger text-paper",
  yellow: "bg-tag text-ink",
};

export function BaseBadge({ children, color = "gray", className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-md border-2 border-ink px-2 py-0.5 font-mono text-xs font-bold ${colors[color]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
