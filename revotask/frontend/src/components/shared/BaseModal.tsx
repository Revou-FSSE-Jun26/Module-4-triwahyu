"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { BaseButton } from "@/components/shared/BaseButton";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

// Stacked dialogs share one scroll lock. Capturing "previous overflow" per dialog would restore
// "hidden" after the last one closes and leave the page unscrollable (FE-12).
let scrollLocks = 0;
let savedOverflow = "";
function lockScroll() {
  if (scrollLocks++ === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}
function unlockScroll() {
  if (--scrollLocks === 0) document.body.style.overflow = savedOverflow;
}

/** Reusable dialog shell that wraps every in-app form (FE-03, FE-09). */
export function BaseModal({ open, title, onClose, children, wide = false }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockScroll();

    const panel = panelRef.current;
    const firstField = panel?.querySelector<HTMLElement>("input, textarea, select");
    (firstField ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full flex-col border-3 border-ink bg-paper shadow-hard-lg ${
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* The header stays put; only the body scrolls, so the title and Close are always reachable (FE-10). */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b-3 border-ink px-5 py-2 sm:px-6">
          <h2 id={titleId} className="text-xl font-extrabold tracking-tight">
            {title}
          </h2>
          <BaseButton variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose}>
            <span aria-hidden="true" className="text-2xl leading-none">
              ×
            </span>
          </BaseButton>
        </div>
        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}
