import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";

const state = vi.hoisted(() => ({
  notifications: [] as { id: string; message: string; read: boolean; created_at: string; board_id: string | null }[],
  unreadCount: 0,
  isLoading: false,
  markRead: vi.fn(),
}));
vi.mock("@/hooks/useNotifications", () => ({ useNotifications: () => state }));
vi.mock("@/hooks/useErrorHandler", () => ({ useErrorHandler: () => vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  state.notifications = [];
  state.unreadCount = 0;
  state.markRead.mockReset().mockResolvedValue(undefined);
});

const note = (id: string, message: string, read = false) => ({
  id,
  message,
  read,
  created_at: "2026-01-01T00:00:00+00:00",
  board_id: null,
});

// REQ-NOTIF-3: the bell shows the unread count in the header.
describe("NotificationBell", () => {
  it("shows no badge when everything is read", () => {
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByTestId("unread-count")).not.toBeInTheDocument();
  });

  it("shows the unread count in the badge and the accessible name", () => {
    state.unreadCount = 3;
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
    expect(screen.getByTestId("unread-count")).toHaveTextContent("3");
  });

  it("caps very large counts", () => {
    state.unreadCount = 250;
    render(<NotificationBell />);
    expect(screen.getByTestId("unread-count")).toHaveTextContent("99+");
  });

  it("opens a list, offers Mark read only for unread items, and closes on Escape", async () => {
    state.unreadCount = 1;
    state.notifications = [note("1", "Ada assigned you to “Task”."), note("2", "Old news", true)];
    render(<NotificationBell />);

    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    const panel = screen.getByRole("region", { name: "Notifications" });
    expect(panel).toHaveTextContent("Ada assigned you");
    expect(screen.getAllByRole("button", { name: "Mark read" })).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Mark read" }));
    expect(state.markRead).toHaveBeenCalledWith("1");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    render(<NotificationBell />);
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText(/all caught up/)).toBeInTheDocument();
  });
});
