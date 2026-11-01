import { describe, expect, it, vi } from "vitest";
import { readStorage, storageKeys, writeStorage } from "@/lib/storage";

describe("storage adapter", () => {
  it("exposes a single versioned namespace", () => {
    expect(storageKeys.auth).toBe("nawy-auth-v1");
    expect(new Set(Object.values(storageKeys)).size).toBe(Object.values(storageKeys).length);
    Object.values(storageKeys).forEach((key) => expect(key.startsWith("nawy-")).toBe(true));
  });

  it("returns the fallback when nothing is stored", () => {
    expect(readStorage("missing", { seed: true })).toEqual({ seed: true });
  });

  it("parses stored JSON", () => {
    localStorage.setItem("nawy-test", JSON.stringify({ qty: 3, extras: ["cheese"] }));
    expect(readStorage("nawy-test", null)).toEqual({ qty: 3, extras: ["cheese"] });
  });

  it("returns the fallback for corrupt JSON instead of throwing", () => {
    localStorage.setItem("nawy-test", "{not-json");
    expect(readStorage("nawy-test", ["safe"])).toEqual(["safe"]);
  });

  it("returns the fallback when storage access is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(readStorage("nawy-test", "fallback")).toBe("fallback");
  });

  it("writes JSON values", () => {
    writeStorage("nawy-test", { count: 2 });
    expect(localStorage.getItem("nawy-test")).toBe('{"count":2}');
  });

  it("swallows quota and disabled-storage errors", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(() => writeStorage("nawy-test", "value")).not.toThrow();
  });
});
