import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePersistentState } from "@/hooks/use-persistent-state";

const decodeInt = (stored: unknown, fallback: number) =>
  typeof stored === "number" && Number.isFinite(stored) ? stored : fallback;

describe("usePersistentState", () => {
  it("hydrates a stored value after mount", () => {
    localStorage.setItem("nawy-hook-test", "5");
    const { result } = renderHook(() => usePersistentState("nawy-hook-test", 0, decodeInt));
    expect(result.current[0]).toBe(5);
    expect(result.current[2]).toBe(true);
  });

  it("falls back when nothing is stored", () => {
    const { result } = renderHook(() => usePersistentState("nawy-hook-test", 3, decodeInt));
    expect(result.current[0]).toBe(3);
  });

  it("does not overwrite stored data with the initial value during hydration", async () => {
    localStorage.setItem("nawy-hook-test", "9");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    renderHook(() => usePersistentState("nawy-hook-test", 0, decodeInt));
    await waitFor(() => expect(setItem).toHaveBeenCalled());
    expect(setItem.mock.calls.some(([, value]) => value === "0")).toBe(false);
    expect(setItem).toHaveBeenLastCalledWith("nawy-hook-test", "9");
  });

  it("sanitizes corrupt or tampered values through the decoder", () => {
    localStorage.setItem("nawy-hook-test", JSON.stringify(["not", "a", "number"]));
    const { result } = renderHook(() => usePersistentState("nawy-hook-test", 1, decodeInt));
    expect(result.current[0]).toBe(1);
  });

  it("persists updates after hydration", () => {
    const { result } = renderHook(() => usePersistentState("nawy-hook-test", 0, decodeInt));
    act(() => result.current[1](12));
    expect(result.current[0]).toBe(12);
    expect(localStorage.getItem("nawy-hook-test")).toBe("12");
  });

  it("keeps independent hooks isolated by key", () => {
    localStorage.setItem("nawy-a", "1");
    localStorage.setItem("nawy-b", "2");
    const a = renderHook(() => usePersistentState("nawy-a", 0, decodeInt));
    const b = renderHook(() => usePersistentState("nawy-b", 0, decodeInt));
    expect(a.result.current[0]).toBe(1);
    expect(b.result.current[0]).toBe(2);
    act(() => a.result.current[1](10));
    expect(localStorage.getItem("nawy-a")).toBe("10");
    expect(localStorage.getItem("nawy-b")).toBe("2");
  });
});
