import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POLL_INTERVAL_MS, useNotifications } from "./useNotifications";
import type { NotificationPage } from "@/types";

const page = (unread: number): NotificationPage => ({
  items: Array.from({ length: unread }, (_, i) => ({
    id: `n${i}`,
    type: "welcome" as const,
    message: "hi",
    card_id: null,
    board_id: null,
    read: false,
    created_at: "2026-01-01T00:00:00+00:00",
  })),
  page: 1,
  per_page: 20,
  total: unread,
  pages: 1,
  unread_count: unread,
});

const { list, markRead, logout, auth } = vi.hoisted(() => {
  const list = vi.fn();
  const markRead = vi.fn();
  const logout = vi.fn();
  // One stable object, so the hook's effect does not restart on every render.
  const auth = { token: "tok", logout, api: { notifications: { list, markRead } } };
  return { list, markRead, logout, auth };
});
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));

beforeEach(() => {
  vi.useFakeTimers();
  list.mockReset().mockResolvedValue(page(2));
  markRead.mockReset().mockResolvedValue({});
  auth.token = "tok";
});
afterEach(() => vi.useRealTimers());

// REQ-NOTIF-3: polls every 30 seconds, never overlaps, cleans up.
describe("useNotifications", () => {
  it("loads immediately and exposes the unread count", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});
    expect(list).toHaveBeenCalledTimes(1);
    expect(result.current.unreadCount).toBe(2);
    expect(result.current.notifications).toHaveLength(2);
  });

  it("polls every 30 seconds and picks up new notifications", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});
    list.mockResolvedValue(page(5));

    await act(async () => void vi.advanceTimersByTime(POLL_INTERVAL_MS - 1));
    expect(list).toHaveBeenCalledTimes(1);
    await act(async () => void vi.advanceTimersByTime(1));

    expect(POLL_INTERVAL_MS).toBe(30_000);
    expect(list).toHaveBeenCalledTimes(2);
    expect(result.current.unreadCount).toBe(5);
  });

  it("skips a tick while the previous request is still in flight", async () => {
    let resolve!: (value: NotificationPage) => void;
    list.mockImplementation(() => new Promise<NotificationPage>((r) => (resolve = r)));
    renderHook(() => useNotifications());

    await act(async () => void vi.advanceTimersByTime(POLL_INTERVAL_MS * 3));
    expect(list).toHaveBeenCalledTimes(1);

    await act(async () => resolve(page(1)));
    await act(async () => void vi.advanceTimersByTime(POLL_INTERVAL_MS));
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("stops polling on unmount", async () => {
    const { unmount } = renderHook(() => useNotifications());
    await act(async () => {});
    unmount();
    await act(async () => void vi.advanceTimersByTime(POLL_INTERVAL_MS * 5));
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("does not poll when signed out", async () => {
    auth.token = null as unknown as string;
    renderHook(() => useNotifications());
    await act(async () => void vi.advanceTimersByTime(POLL_INTERVAL_MS * 2));
    expect(list).not.toHaveBeenCalled();
  });

  it("signs out when polling gets a 401", async () => {
    const { ApiError } = await import("@/lib/errors");
    list.mockRejectedValue(new ApiError("expired", 401));
    renderHook(() => useNotifications());
    await act(async () => {});
    expect(logout).toHaveBeenCalledWith({ reason: "expired" });
  });

  it("marks a notification read optimistically and rolls back on failure", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});

    markRead.mockRejectedValueOnce(new Error("boom"));
    await act(async () => {
      await result.current.markRead("n0").catch(() => undefined);
    });
    expect(result.current.unreadCount).toBe(2);

    await act(async () => result.current.markRead("n0"));
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications.find((n) => n.id === "n0")?.read).toBe(true);
  });
});
