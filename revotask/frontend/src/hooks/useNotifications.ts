"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isApiError } from "@/lib/errors";
import type { AppNotification } from "@/types";

export const POLL_INTERVAL_MS = 30_000;

/** Polls GET /api/notifications every 30 s while signed in (REQ-NOTIF-3, FE-12). */
export function useNotifications(intervalMs = POLL_INTERVAL_MS) {
  const { api, token, logout } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return; // never overlap requests
    inFlight.current = true;
    try {
      const page = await api.notifications.list(1, 20);
      setNotifications(page.items);
      setUnreadCount(page.unread_count);
      setError(null);
    } catch (caught) {
      if (isApiError(caught) && caught.statusCode === 401)
        logout({ reason: "expired" });
      else
        setError(
          caught instanceof Error
            ? caught
            : new Error("Failed to load notifications"),
        );
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [api, logout]);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    void refresh();
    const timer = window.setInterval(() => void refresh(), intervalMs);
    return () => window.clearInterval(timer);
  }, [token, refresh, intervalMs]);

  const markRead = useCallback(
    async (id: string) => {
      const previous = notifications;
      setNotifications((items) =>
        items.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      setUnreadCount((count) =>
        Math.max(
          0,
          count - (previous.find((n) => n.id === id && !n.read) ? 1 : 0),
        ),
      );
      try {
        await api.notifications.markRead(id);
      } catch (caught) {
        setNotifications(previous);
        setUnreadCount(previous.filter((item) => !item.read).length);
        throw caught;
      }
    },
    [api, notifications],
  );

  return { notifications, unreadCount, isLoading, error, refresh, markRead };
}
