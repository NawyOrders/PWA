import { describe, expect, it, vi } from "vitest";
import {
  createAuthFetch,
  createRefreshCoordinator,
  createStorageRefreshLock,
  decodeIdentity,
  decodeSession,
  grantFromPayload,
  grantFromTokens,
  identityFromPayload,
  sessionIsExpired,
  sessionNeedsRefresh,
  type AccessGrant,
  type RefreshLock,
} from "@/lib/session";
import type { CustomerSessionPayload, TokenPair } from "@/lib/api";

const NOW = Date.parse("2026-11-05T10:00:00Z");
const LATER = new Date(NOW + 900_000).toISOString();

const payload: CustomerSessionPayload = {
  customerId: "customer-1",
  phoneNumber: "+201012345678",
  fullName: "Nawy Guest",
  email: "guest@example.com",
  accessToken: "access-token",
  tokenType: "Bearer",
  expiresIn: 900,
  expiresAtUtc: LATER,
};

const pair: TokenPair = {
  accessToken: "rotated-access",
  tokenType: "Bearer",
  expiresIn: 900,
  expiresAtUtc: new Date(NOW + 1_800_000).toISOString(),
  refreshTokenExpiresAtUtc: null,
};

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

/* -------------------------------------------------------------------------- */
/* Identity and grant: the two halves of a session                            */
/* -------------------------------------------------------------------------- */

describe("identityFromPayload", () => {
  it("keeps exactly what the app may persist", () => {
    expect(identityFromPayload(payload)).toEqual({
      customerId: "customer-1",
      phoneNumber: "+201012345678",
      fullName: "Nawy Guest",
      email: "guest@example.com",
    });
  });

  it("has no token in it, by construction", () => {
    const identity = identityFromPayload(payload) as unknown as Record<string, unknown>;
    expect(identity.accessToken).toBeUndefined();
    expect(identity.refreshToken).toBeUndefined();
  });

  it("treats a blank name as a blank string, not as undefined", () => {
    expect(identityFromPayload({ ...payload, fullName: null }).fullName).toBe("");
  });

  it("caps hostile strings so storage cannot grow without limit", () => {
    const identity = identityFromPayload({
      ...payload,
      customerId: "c".repeat(500),
      phoneNumber: "p".repeat(500),
      fullName: "n".repeat(500),
      email: "e".repeat(500),
    });
    expect(identity.customerId).toHaveLength(64);
    expect(identity.phoneNumber).toHaveLength(32);
    expect(identity.fullName).toHaveLength(120);
    expect(identity.email).toHaveLength(160);
  });
});

describe("grantFromPayload", () => {
  it("trusts the server's own expiry", () => {
    expect(grantFromPayload(payload, NOW)).toEqual({ accessToken: "access-token", accessExpiresAt: NOW + 900_000 });
  });

  it("derives the expiry from expiresIn when the timestamp is unusable", () => {
    expect(grantFromPayload({ ...payload, expiresAtUtc: "not-a-date" }, NOW)?.accessExpiresAt).toBe(NOW + 900_000);
  });

  it("ignores a timestamp already in the past rather than discarding a fresh token", () => {
    const grant = grantFromPayload({ ...payload, expiresAtUtc: new Date(NOW - 1000).toISOString() }, NOW);
    expect(grant?.accessExpiresAt).toBe(NOW + 900_000);
  });

  it("marks a response with neither timestamp nor lifetime as stale", () => {
    const grant = grantFromPayload({ ...payload, expiresAtUtc: "", expiresIn: 0 }, NOW);
    expect(grant?.accessExpiresAt).toBe(0);
    expect(sessionIsExpired(grant, NOW)).toBe(true);
  });

  it("refuses a payload with no access token", () => {
    expect(grantFromPayload({ ...payload, accessToken: "" }, NOW)).toBeNull();
    expect(grantFromPayload({ ...payload, accessToken: undefined as unknown as string }, NOW)).toBeNull();
  });

  it("will not hold a string that is too big to be a token", () => {
    expect(grantFromPayload({ ...payload, accessToken: "x".repeat(9000) }, NOW)).toBeNull();
  });
});

describe("grantFromTokens", () => {
  it("reads a rotated pair the same way", () => {
    expect(grantFromTokens(pair, NOW)).toEqual({ accessToken: "rotated-access", accessExpiresAt: NOW + 1_800_000 });
  });

  it("refuses a pair with no access token", () => {
    expect(grantFromTokens({ ...pair, accessToken: "" }, NOW)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Storage is untrusted input                                                 */
/* -------------------------------------------------------------------------- */

describe("decodeSession", () => {
  it("round-trips the identity the app wrote", () => {
    const identity = identityFromPayload(payload);
    expect(decodeSession(JSON.parse(JSON.stringify(identity)))?.identity).toEqual(identity);
  });

  it("rejects anything that is not an object", () => {
    for (const value of [null, undefined, "token", 42, [], true]) expect(decodeSession(value)).toBeNull();
  });

  it("rejects an object that identifies nobody", () => {
    expect(decodeSession({ fullName: "someone" })).toBeNull();
    expect(decodeSession({ customerId: 7, phoneNumber: 7 })).toBeNull();
  });

  it("accepts a record that only carries a phone number", () => {
    expect(decodeSession({ phoneNumber: "+201012345678" })?.identity.phoneNumber).toBe("+201012345678");
  });

  it("keeps a dropped cookie's refresh token only long enough to adopt it", () => {
    // Sessions written before the token moved into an httpOnly cookie carry it
    // in storage. It is reported once, to the code that hands it to the BFF, and
    // never becomes part of the identity that gets written back.
    const stored = decodeSession({ customerId: "c", phoneNumber: "p", refreshToken: "legacy-token" });
    expect(stored?.legacyRefreshToken).toBe("legacy-token");
    expect(stored?.identity).not.toHaveProperty("refreshToken");
  });

  it("drops a non-string or oversized legacy token", () => {
    expect(decodeSession({ customerId: "c", refreshToken: 7 })?.legacyRefreshToken).toBeNull();
    expect(decodeSession({ customerId: "c", refreshToken: "x".repeat(9000) })?.legacyRefreshToken).toBeNull();
  });

  it("keeps only a string email", () => {
    expect(decodeSession({ customerId: "c", email: { nested: true } })?.identity.email).toBeNull();
  });

  it("decodeIdentity is the same read without the migration detail", () => {
    expect(decodeIdentity({ customerId: "c", phoneNumber: "p" })).toEqual({
      customerId: "c",
      phoneNumber: "p",
      fullName: "",
      email: null,
    });
    expect(decodeIdentity({ fullName: "nobody" })).toBeNull();
  });
});

describe("expiry helpers", () => {
  const grant: AccessGrant = { accessToken: "a", accessExpiresAt: NOW + 900_000 };

  it("reports expiry at and after the boundary", () => {
    expect(sessionIsExpired(grant, NOW)).toBe(false);
    expect(sessionIsExpired(grant, NOW + 900_000)).toBe(true);
    expect(sessionIsExpired(null, NOW)).toBe(true);
  });

  it("refreshes a minute before the token actually dies", () => {
    expect(sessionNeedsRefresh(grant, NOW + 300_000)).toBe(false);
    expect(sessionNeedsRefresh(grant, NOW + 830_000)).toBe(false);
    // The boundary is inclusive: one minute left is already "refresh now".
    expect(sessionNeedsRefresh(grant, NOW + 840_000)).toBe(true);
    expect(sessionNeedsRefresh(null, NOW)).toBe(true);
  });

  it("honours a custom skew", () => {
    expect(sessionNeedsRefresh(grant, NOW + 850_000, 0)).toBe(false);
    expect(sessionNeedsRefresh(grant, NOW + 850_000, 120_000)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* One refresh at a time, per tab and per browser                             */
/* -------------------------------------------------------------------------- */

describe("createStorageRefreshLock", () => {
  it("lets the first claimer hold it and refuses a second tab", () => {
    const storage = fakeStorage();
    let now = NOW;
    const a = createStorageRefreshLock({ storage, now: () => now, id: "tab-a" });
    const b = createStorageRefreshLock({ storage, now: () => now, id: "tab-b" });

    expect(a.acquire()).toBe(true);
    expect(a.held()).toBe(false); // "held" means "held by somebody else"
    expect(b.held()).toBe(true);
    expect(b.acquire()).toBe(false);
  });

  it("releases only its own lock", () => {
    const storage = fakeStorage();
    const a = createStorageRefreshLock({ storage, now: () => NOW, id: "tab-a" });
    const b = createStorageRefreshLock({ storage, now: () => NOW, id: "tab-b" });
    a.acquire();
    b.release();
    expect(a.held()).toBe(false);
    expect(b.held()).toBe(true);
    a.release();
    expect(b.held()).toBe(false);
    expect(b.acquire()).toBe(true);
  });

  it("steals a lock whose holder never came back", () => {
    const storage = fakeStorage();
    let now = NOW;
    const a = createStorageRefreshLock({ storage, now: () => now, id: "tab-a", ttlMs: 15_000 });
    const b = createStorageRefreshLock({ storage, now: () => now, id: "tab-b", ttlMs: 15_000 });
    expect(a.acquire()).toBe(true);
    now = NOW + 14_000;
    expect(b.acquire()).toBe(false);
    // A tab that was closed mid-refresh must not sign nobody back in forever.
    now = NOW + 16_000;
    expect(b.acquire()).toBe(true);
  });

  it("settles a simultaneous claim on one winner", () => {
    const storage = fakeStorage();
    // Same instant, same starting state: the write-then-re-read rule is what
    // makes exactly one of these proceed.
    const a = createStorageRefreshLock({ storage, now: () => NOW, id: "tab-a" });
    const b = createStorageRefreshLock({ storage, now: () => NOW, id: "tab-b" });
    const wins = [a.acquire(), b.acquire()].filter(Boolean).length;
    expect(wins).toBe(1);
  });

  it("starts clean over a record it cannot read", () => {
    const storage = fakeStorage({ "nawy-refresh-lock-v1": "{not json" });
    const a = createStorageRefreshLock({ storage, now: () => NOW, id: "tab-a" });
    expect(a.held()).toBe(false);
    expect(a.acquire()).toBe(true);
  });

  it("works as a no-op when there is no storage at all", () => {
    const lock = createStorageRefreshLock({ storage: null, now: () => NOW, id: "server" });
    expect(lock.acquire()).toBe(true);
    expect(lock.held()).toBe(false);
    expect(() => lock.release()).not.toThrow();
  });

  it("fails open when storage refuses the write", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const lock = createStorageRefreshLock({ storage, now: () => NOW, id: "tab-a" });
    // A browser that will not let us coordinate is still one browser: the tab
    // may refresh, it just cannot prove another tab is not doing the same.
    expect(lock.acquire()).toBe(true);
    expect(() => lock.release()).not.toThrow();
  });
});

describe("createRefreshCoordinator", () => {
  const noLock: RefreshLock = { acquire: () => true, release: () => {}, held: () => false };

  it("runs one request for every caller that asks at the same time", async () => {
    const request = vi.fn(async () => pair);
    const coordinator = createRefreshCoordinator({ request, lock: noLock, now: () => NOW });

    const [first, second] = await Promise.all([coordinator.refresh(), coordinator.refresh()]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(coordinator.pending()).toBe(false);
  });

  it("asks again once the previous refresh has settled", async () => {
    const request = vi.fn(async () => pair);
    const coordinator = createRefreshCoordinator({ request, lock: noLock, now: () => NOW });
    await coordinator.refresh();
    await coordinator.refresh();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("hands the rotated grant to the caller and to the store", async () => {
    const onRotated = vi.fn();
    const coordinator = createRefreshCoordinator({
      request: async () => pair,
      onRotated,
      lock: noLock,
      now: () => NOW,
    });
    const grant = await coordinator.refresh();
    expect(grant).toEqual({ accessToken: "rotated-access", accessExpiresAt: NOW + 1_800_000 });
    expect(onRotated).toHaveBeenCalledWith(grant);
  });

  it("shares a rejection with everyone waiting, then lets the next caller try", async () => {
    const request = vi.fn(async () => {
      throw new Error("refresh-token-expired");
    });
    const coordinator = createRefreshCoordinator({ request, lock: noLock, now: () => NOW });
    await expect(Promise.all([coordinator.refresh(), coordinator.refresh()])).rejects.toThrow(
      "refresh-token-expired",
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(coordinator.pending()).toBe(false);
  });

  it("refuses a rotation response it cannot read", async () => {
    const coordinator = createRefreshCoordinator({
      request: async () => ({ ...pair, accessToken: "" }),
      lock: noLock,
      now: () => NOW,
    });
    await expect(coordinator.refresh()).rejects.toThrow("refresh-token-invalid-response");
  });

  it("waits out another tab rather than rotating behind its back", async () => {
    const storage = fakeStorage();
    let clock = NOW;
    const other = createStorageRefreshLock({ storage, now: () => clock, id: "tab-other" });
    expect(other.acquire()).toBe(true);

    const request = vi.fn(async () => pair);
    let waited = 0;
    const coordinator = createRefreshCoordinator({
      request,
      lock: createStorageRefreshLock({ storage, now: () => clock, id: "tab-us" }),
      // Each poll frees a second of the fake clock; the other tab lets go after
      // three of them, which is the whole point of the test.
      wait: async () => {
        waited += 1;
        clock += 1000;
        if (waited === 3) other.release();
      },
      pollMs: 100,
      now: () => clock,
    });

    await expect(coordinator.refresh()).resolves.toMatchObject({ accessToken: "rotated-access" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(waited).toBeGreaterThanOrEqual(3);
    // Released for whoever comes next.
    expect(storage.map.has("nawy-refresh-lock-v1")).toBe(false);
  });

  it("gives up waiting when the other tab never finishes", async () => {
    const storage = fakeStorage();
    const other = createStorageRefreshLock({ storage, now: () => NOW, id: "tab-other" });
    other.acquire();
    const request = vi.fn(async () => pair);
    let polls = 0;
    const coordinator = createRefreshCoordinator({
      request,
      lock: createStorageRefreshLock({ storage, now: () => NOW, id: "tab-us" }),
      wait: async () => {
        polls += 1;
      },
      maxWaitMs: 500,
      pollMs: 100,
      // A frozen clock keeps `held()` true and never reaches the deadline, so
      // only the poll bound can end the wait. Without it this test hangs.
      now: () => NOW,
    });
    await expect(coordinator.refresh()).resolves.toMatchObject({ accessToken: "rotated-access" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(polls).toBeGreaterThan(0);
    expect(polls).toBeLessThanOrEqual(10);
  });

  it("releases the lock even when the request fails", async () => {
    const storage = fakeStorage();
    const lock = createStorageRefreshLock({ storage, now: () => NOW, id: "tab-us" });
    const coordinator = createRefreshCoordinator({
      request: async () => {
        throw new Error("offline");
      },
      lock,
      wait: async () => undefined,
      now: () => NOW,
    });
    await expect(coordinator.refresh()).rejects.toThrow("offline");
    expect(storage.map.has("nawy-refresh-lock-v1")).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* The authenticated fetch                                                    */
/* -------------------------------------------------------------------------- */

describe("createAuthFetch", () => {
  type Call = { url: string; init: RequestInit };

  function responder(...statuses: number[]) {
    const calls: Call[] = [];
    let index = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ url: String(input), init });
      const status = statuses[Math.min(index, statuses.length - 1)] ?? 200;
      index += 1;
      return new Response("{}", { status, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  }

  const fresh: AccessGrant = { accessToken: "a-1", accessExpiresAt: NOW + 900_000 };

  function harness(
    transport: ReturnType<typeof responder>,
    options: {
      grant: AccessGrant | null;
      refresh?: () => Promise<AccessGrant>;
    } = { grant: fresh },
  ) {
    const signedOut = vi.fn();
    const refresh = vi.fn(options.refresh ?? (async () => ({ ...fresh, accessToken: "a-2" })));
    const authFetch = createAuthFetch({
      getGrant: () => options.grant,
      refresh,
      onSignedOut: signedOut,
      join: (path) => `https://tenant.test${path}`,
      fetchImpl: transport.fetchImpl,
      // The fixtures are pinned to `NOW`, so the staleness check has to read
      // the same clock or every grant below looks expired on a real machine.
      now: () => NOW,
    });
    return { authFetch, calls: transport.calls, refresh, signedOut };
  }

  it("sends the bearer token to the joined url without cookies", async () => {
    const { authFetch, calls } = harness(responder(200), { grant: fresh });
    await authFetch("/api/v1/orders");
    expect(calls[0]?.url).toBe("https://tenant.test/api/v1/orders");
    expect(calls[0]?.init.headers).toBeInstanceOf(Headers);
    expect(new Headers(calls[0]?.init.headers).get("Authorization")).toBe("Bearer a-1");
    expect(calls[0]?.init.credentials).toBe("omit");
  });

  it("keeps headers the caller already set", async () => {
    const { authFetch, calls } = harness(responder(200), { grant: fresh });
    await authFetch("/api/v1/orders", { headers: { "Content-Type": "application/json" }, method: "POST" });
    const headers = new Headers(calls[0]?.init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer a-1");
  });

  it("refreshes before sending when the grant is already stale", async () => {
    const { authFetch, calls, refresh } = harness(responder(200), {
      grant: { accessToken: "old", accessExpiresAt: NOW },
    });
    await authFetch("/api/v1/orders");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(new Headers(calls[0]?.init.headers).get("Authorization")).toBe("Bearer a-2");
  });

  it("refreshes once and retries once after a 401", async () => {
    const { authFetch, calls, refresh, signedOut } = harness(responder(401, 200), { grant: fresh });
    const response = await authFetch("/api/v1/orders");
    expect(response.status).toBe(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(signedOut).not.toHaveBeenCalled();
    expect(calls).toHaveLength(2);
    expect(new Headers(calls[1]?.init.headers).get("Authorization")).toBe("Bearer a-2");
  });

  it("never loops: a second 401 ends the session and returns the response", async () => {
    const { authFetch, calls, refresh, signedOut } = harness(responder(401, 401), { grant: fresh });
    const response = await authFetch("/api/v1/orders");
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(signedOut).toHaveBeenCalledTimes(1);
  });

  it("signs out when the retry itself cannot refresh", async () => {
    const { authFetch, calls, signedOut } = harness(responder(401), {
      grant: fresh,
      refresh: async () => {
        throw new Error("RefreshToken.Expired");
      },
    });
    const response = await authFetch("/api/v1/orders");
    // The customer sees the 401 they were given, and the session is over.
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(1);
    expect(signedOut).toHaveBeenCalledTimes(1);
  });

  it("does not send a request at all when the pre-flight refresh fails", async () => {
    const { authFetch, calls, signedOut } = harness(responder(200), {
      grant: null,
      refresh: async () => {
        throw new Error("RefreshToken.Invalid");
      },
    });
    await expect(authFetch("/api/v1/orders")).rejects.toThrow("session-expired");
    expect(calls).toHaveLength(0);
    expect(signedOut).toHaveBeenCalledTimes(1);
  });

  it("passes the body and method through untouched", async () => {
    const { authFetch, calls } = harness(responder(201), { grant: fresh });
    const response = await authFetch("/api/v1/addresses", { method: "POST", body: '{"title":"home"}' });
    expect(response.status).toBe(201);
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe('{"title":"home"}');
  });
});
