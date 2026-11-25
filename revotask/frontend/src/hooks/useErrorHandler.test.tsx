import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messageForStatus, useErrorHandler } from "./useErrorHandler";
import { ApiError } from "@/lib/errors";

const { error, logout } = vi.hoisted(() => ({ error: vi.fn(), logout: vi.fn() }));
vi.mock("@/lib/toast", () => ({ notify: { error, success: vi.fn(), loading: vi.fn(), dismiss: vi.fn() } }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ logout }) }));

beforeEach(() => vi.clearAllMocks());

// REQ-FND-5: ApiError status codes map to fixed user-facing toast messages.
describe("messageForStatus", () => {
  it.each([
    [0, /Cannot reach the server/],
    [401, /session has expired/],
    [403, /permission/],
    [404, /couldn't find/],
    [429, /Too many requests/],
    [500, /our side/],
    [503, /our side/],
  ])("status %i", (status, expected) => expect(messageForStatus(status, "internal detail")).toMatch(expected));

  it("shows the server's authored message for validation and conflict statuses only", () => {
    expect(messageForStatus(400, "Validation failed: email")).toBe("Validation failed: email");
    expect(messageForStatus(409, "Email is already registered")).toBe("Email is already registered");
    expect(messageForStatus(500, "SELECT * FROM users")).not.toContain("SELECT");
  });
});

describe("useErrorHandler", () => {
  it("toasts the mapped message for an ApiError", () => {
    const { result } = renderHook(() => useErrorHandler());
    result.current(new ApiError("raw server text", 403));
    expect(error).toHaveBeenCalledWith("You don't have permission to do that.");
    expect(logout).not.toHaveBeenCalled();
  });

  it("signs the user out on 401", () => {
    const { result } = renderHook(() => useErrorHandler());
    result.current(new ApiError("expired", 401));
    expect(error).toHaveBeenCalledWith("Your session has expired. Please sign in again.");
    expect(logout).toHaveBeenCalledWith({ reason: "expired" });
  });

  it("never leaks the message of an unknown error", () => {
    const { result } = renderHook(() => useErrorHandler());
    result.current(new Error("TypeError: cannot read properties of undefined"));
    expect(error).toHaveBeenCalledWith("An unexpected error occurred. Please try again.");
  });
});
