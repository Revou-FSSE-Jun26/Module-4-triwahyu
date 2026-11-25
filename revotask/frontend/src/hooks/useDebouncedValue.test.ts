import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// REQ-CARD-8: card search waits 300ms after the last keystroke.
describe("useDebouncedValue", () => {
  it("only updates after the value is stable for the delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: "" } });

    rerender({ value: "w" });
    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe("");

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe("w");
  });

  it("restarts the wait on every keystroke", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: "" } });

    for (const typed of ["w", "wr", "wri"]) {
      rerender({ value: typed });
      act(() => void vi.advanceTimersByTime(200));
    }
    expect(result.current).toBe("");

    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe("wri");
  });
});
