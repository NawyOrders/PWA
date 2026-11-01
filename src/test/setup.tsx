import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

function installBrowserStubs() {
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  for (const name of ["IntersectionObserver", "ResizeObserver"] as const) {
    if (!(name in window)) {
      Object.defineProperty(window, name, { configurable: true, writable: true, value: MockObserver });
    }
  }
  if (!("createObjectURL" in URL)) {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  }
}

const hasDom = typeof window !== "undefined";

beforeEach(() => {
  if (!hasDom) return;
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  installBrowserStubs();
});

afterEach(() => {
  if (hasDom) cleanup();
  vi.useRealTimers();
  if (hasDom) localStorage.clear();
});
