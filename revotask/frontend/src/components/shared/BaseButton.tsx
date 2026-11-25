import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "md" | "sm" | "icon" | "card";
export type ButtonAlign = "center" | "start" | "between";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Horizontal alignment of the content. A prop, not a className override, so classes never conflict. */
  align?: ButtonAlign;
  className?: string;
  children: ReactNode;
};
type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = CommonProps & { href: string; "aria-label"?: string };

// Each variant owns its border and shadow so classes never conflict. Text on orange is ink, never white (FE-13).
const variants: Record<ButtonVariant, string> = {
  primary:
    "border-ink bg-key text-ink shadow-key active:translate-x-[3px] active:translate-y-[3px] active:shadow-pressed",
  secondary:
    "border-ink bg-paper text-ink shadow-key active:translate-x-[3px] active:translate-y-[3px] active:shadow-pressed",
  destructive:
    "border-ink bg-danger text-paper shadow-key active:translate-x-[3px] active:translate-y-[3px] active:shadow-pressed",
  ghost: "border-transparent bg-transparent text-ink hover:bg-concrete-200",
};

// Every size keeps a 44px minimum hit target (FE-10).
const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 py-2 text-sm",
  sm: "min-h-11 px-3 py-1.5 text-xs",
  icon: "h-11 w-11 p-0 text-sm",
  card: "min-h-11 px-2 py-1.5 text-sm",
};

const aligns: Record<ButtonAlign, string> = {
  center: "justify-center text-center",
  start: "justify-start text-left",
  between: "justify-between text-left",
};

const base =
  "inline-flex items-center gap-2 rounded-lg border-3 font-extrabold " +
  "transition-[transform,box-shadow] duration-120 disabled:pointer-events-none disabled:opacity-50";

/** The only button in the product. Renders a link when `href` is given, otherwise a `<button>`. */
export function BaseButton(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", align = "center", className = "", children } = props;
  const classes = `${base} ${sizes[size]} ${aligns[align]} ${variants[variant]} ${className}`.trim();

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes} aria-label={props["aria-label"]}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _v, size: _s, align: _a, className: _c, children: _ch, href: _h, type, ...rest } = props;
  return (
    <button type={type ?? "button"} className={classes} {...rest}>
      {children}
    </button>
  );
}
