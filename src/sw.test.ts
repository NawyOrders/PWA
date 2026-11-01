// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type StoredResponse = Response;
type Handler = (event: Record<string, unknown>) => void;

const ORIGIN = "https://app.test";

function request(url: string, overrides: Record<string, unknown> = {}) {
  return { method: "GET", url, mode: "no-cors", ...overrides };
}

function createHarness() {
  const listeners = new Map<string, Handler>();
  const stores = new Map<string, Map<string, StoredResponse>>();
  const keyOf = (value: unknown) => (typeof value === "string" ? value : (value as { url: string }).url);

  const storeFor = (name: string) => {
    let store = stores.get(name);
    if (!store) {
      store = new Map<string, StoredResponse>();
      stores.set(name, store);
    }
    return store;
  };

  const caches = {
    open: vi.fn(async (name: string) => {
      const store = storeFor(name);
      return {
        addAll: vi.fn(async (requests: string[]) => {
          for (const item of requests) {
            const response = await fetch(item);
            if (!response.ok) throw new Error(`precache failed: ${item}`);
            store.set(item, response);
          }
        }),
        put: vi.fn(async (key: unknown, response: StoredResponse) => {
          store.set(keyOf(key), response);
        }),
        match: vi.fn(async (key: unknown) => store.get(keyOf(key))),
      };
    }),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
    match: vi.fn(async (key: unknown) => {
      for (const store of stores.values()) {
        const hit = store.get(keyOf(key));
        if (hit) return hit;
      }
      return undefined;
    }),
  };

  const fetch = vi.fn(async (input: unknown) => {
    const key = keyOf(input);
    return new Response(`network:${key}`, { status: 200 });
  });

  const self = {
    location: { origin: ORIGIN },
    addEventListener: vi.fn((type: string, handler: Handler) => listeners.set(type, handler)),
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) },
  };

  const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  runInNewContext(source, { self, caches, fetch, URL, Response, Promise, console });

  return { listeners, stores, caches, fetch, self };
}

async function dispatch(
  handler: Handler,
  event: Record<string, unknown>,
): Promise<{ respondWith: ReturnType<typeof vi.fn>; result: unknown }> {
  let settled: Promise<unknown> | undefined;
  const respondWith = vi.fn((value: unknown) => {
    settled = Promise.resolve(value);
  });
  const waitUntil = vi.fn((value: unknown) => {
    settled = Promise.resolve(value);
  });
  handler({ ...event, respondWith, waitUntil });
  const result = await settled;
  return { respondWith, result };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("service worker", () => {
  it("precaches the core shell and activates immediately", async () => {
    const { listeners, fetch, self, caches } = createHarness();
    await dispatch(listeners.get("install")!, {});
    expect(caches.open).toHaveBeenCalledWith("nawy-orders-v1");
    expect(fetch).toHaveBeenCalledTimes(7);
    expect(self.skipWaiting).toHaveBeenCalled();
  });

  it("removes stale caches and claims clients on activate", async () => {
    const { listeners, stores, caches, self } = createHarness();
    stores.set("nawy-orders-v0", new Map());
    await dispatch(listeners.get("activate")!, {});
    expect(caches.delete).toHaveBeenCalledWith("nawy-orders-v0");
    expect(caches.delete).not.toHaveBeenCalledWith("nawy-orders-v1");
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it("serves navigations network-first and updates the cache", async () => {
    const { listeners, fetch, stores } = createHarness();
    const nav = request(`${ORIGIN}/orders`, { mode: "navigate" });
    const { result } = await dispatch(listeners.get("fetch")!, { request: nav });
    await flush();
    expect(fetch).toHaveBeenCalledWith(nav);
    expect((result as Response).status).toBe(200);
    expect(stores.get("nawy-orders-v1")?.has(nav.url)).toBe(true);
  });

  it("falls back to the cached navigation when offline", async () => {
    const { listeners, fetch, stores } = createHarness();
    const nav = request(`${ORIGIN}/orders`, { mode: "navigate" });
    const cached = new Response("cached-orders", { status: 200 });
    stores.set("nawy-orders-v1", new Map([[nav.url, cached]]));
    fetch.mockRejectedValueOnce(new Error("offline"));
    const { result } = await dispatch(listeners.get("fetch")!, { request: nav });
    expect(await (result as Response).text()).toBe("cached-orders");
  });

  it("falls back to /offline when neither route nor shell is cached", async () => {
    const { listeners, fetch, stores } = createHarness();
    const nav = request(`${ORIGIN}/unknown`, { mode: "navigate" });
    stores.set("nawy-orders-v1", new Map([["/offline", new Response("offline-page")]]));
    fetch.mockRejectedValueOnce(new Error("offline"));
    const { result } = await dispatch(listeners.get("fetch")!, { request: nav });
    expect(await (result as Response).text()).toBe("offline-page");
  });

  it("serves static assets cache-first without hitting the network", async () => {
    const { listeners, fetch, stores } = createHarness();
    const chunk = request(`${ORIGIN}/_next/static/chunks/app.js`);
    const cached = new Response("cached-chunk");
    stores.set("nawy-orders-v1", new Map([[chunk.url, cached]]));
    const { result } = await dispatch(listeners.get("fetch")!, { request: chunk });
    expect(await (result as Response).text()).toBe("cached-chunk");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches and stores a static asset on a cache miss", async () => {
    const { listeners, fetch, stores } = createHarness();
    const image = request(`${ORIGIN}/images/burger.webp`);
    const { result } = await dispatch(listeners.get("fetch")!, { request: image });
    await flush();
    expect(fetch).toHaveBeenCalledWith(image);
    expect(await (result as Response).text()).toBe(`network:${image.url}`);
    expect(stores.get("nawy-orders-v1")?.has(image.url)).toBe(true);
  });

  it("ignores non-GET, cross-origin and non-static requests", async () => {
    const { listeners } = createHarness();
    const handler = listeners.get("fetch")!;

    for (const req of [
      request(`${ORIGIN}/cart`, { method: "POST" }),
      request(`${ORIGIN}/cart`),
      request(`${ORIGIN}/api/orders`),
      request("https://cdn.example/app.js"),
    ]) {
      const respondWith = vi.fn();
      handler({ request: req, respondWith, waitUntil: vi.fn() });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });
});
