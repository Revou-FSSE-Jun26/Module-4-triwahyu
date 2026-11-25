"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useNotifications } from "@/hooks/useNotifications";

/** Header bell with an unread badge and a dropdown of recent notifications (REQ-NOTIF-3). */
export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markRead } =
    useNotifications();
  const handleError = useErrorHandler();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <div ref={rootRef} className="relative">
      <BaseButton
        variant="secondary"
        size="icon"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="relative"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7Zm4 10a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 ? (
          <span data-testid="unread-count" className="absolute -right-2 -top-2">
            <BaseBadge color="red">
              {unreadCount > 99 ? "99+" : unreadCount}
            </BaseBadge>
          </span>
        ) : null}
      </BaseButton>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-3 max-h-96 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto border-3 border-ink bg-paper shadow-hard-lg"
        >
          {isLoading && notifications.length === 0 ? (
            <p className="p-4 text-sm">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="p-4 text-sm">You&apos;re all caught up.</p>
          ) : (
            <ul>
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className="border-b-2 border-ink last:border-b-0"
                >
                  <div
                    className={`flex items-start gap-3 p-3 ${item.read ? "" : "bg-tag/40"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm">{item.message}</p>
                      <p className="mt-1 font-mono text-xs text-concrete-700">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.board_id ? (
                        <Link
                          href={`/boards/${item.board_id}`}
                          className="text-xs font-bold underline"
                          onClick={() => setOpen(false)}
                        >
                          Open board
                        </Link>
                      ) : null}
                    </div>
                    {!item.read ? (
                      <BaseButton
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => markRead(item.id).catch(handleError)}
                      >
                        Mark read
                      </BaseButton>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
