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
  RefreshLockedError,
  sessionIsExpired,
  sessionNeedsRefresh,
  type AccessGrant,
  type RefreshCoordinator,
  type RefreshLock,
} from "@/lib/session";
import type { AuthErrorCode, CustomerSessionPayload, TokenPair } from "@/lib/api";
import { AppError, REQUEST_TIMEOUT_MS } from "@/lib/api";

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

  it("keeps a refused delete from trapping the next tab", () => {
    const storage = fakeStorage();
    const stubborn = {
      ...storage,
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const lock = createStorageRefreshLock({ storage: stubborn, now: () => NOW, id: "tab-a" });
    expect(lock.acquire()).toBe(true);
    // The record stays where it was: making it stale is the TTL's job, not a
    // delete this browser just refused.
    expect(() => lock.release()).not.toThrow();
    expect(stubborn.map.size).toBe(1);

    const next = createStorageRefreshLock({ storage, now: () => NOW, id: "tab-b" });
    expect(next.acquire()).toBe(false);
    // ...until the default TTL — two request timeouts — makes it fair game.
    expect(
      createStorageRefreshLock({ storage, now: () => NOW + REQUEST_TIMEOUT_MS * 2, id: "tab-c" }).acquire(),
    ).toBe(true);
  });

  it("names a tab without crypto.randomUUID, and names the next one differently", () => {
    // Some webviews expose a `crypto` with no UUID helper. The fallback still
    // has to differ per tab, or two tabs would hold the same name and wait on
    // each other forever.
    vi.stubGlobal("crypto", { randomUUID: undefined });
    try {
      const first = createStorageRefreshLock();
      expect(first.acquire()).toBe(true);
      const firstName = JSON.parse(localStorage.getItem("nawy-refresh-lock-v1")!).id as string;
      expect(firstName).toMatch(/^tab-/);
      first.release();

      const second = createStorageRefreshLock();
      expect(second.acquire()).toBe(true);
      expect(JSON.parse(localStorage.getItem("nawy-refresh-lock-v1")!).id).not.toBe(firstName);
      second.release();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("treats a page with no storage at all as uncontended", () => {
    // The default wiring, not an injected `storage: null`: a non-browser host
    // has no `localStorage` to look at, and one tab cannot be racing itself.
    vi.stubGlobal("localStorage", undefined);
    try {
      const lock = createStorageRefreshLock();
      expect(lock.acquire()).toBe(true);
      expect(lock.held()).toBe(false);
      expect(() => lock.release()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The wiring the provider actually uses: no injected storage, no fake clock  */
/* -------------------------------------------------------------------------- */

describe("createStorageRefreshLock with its defaults", () => {
  const KEY = "nawy-refresh-lock-v1";

  function record(): { id: string; takenAt: number } {
    const raw = localStorage.getItem(KEY);
    expect(raw, "the lock has to be written where another tab can read it").toBeTypeOf("string");
    return JSON.parse(raw!) as { id: string; takenAt: number };
  }

  it("writes to the real localStorage under the documented key", () => {
    const lock = createStorageRefreshLock({ id: "tab-real" });
    expect(lock.acquire()).toBe(true);

    expect(record()).toMatchObject({ id: "tab-real" });
    expect(record().takenAt).toBeLessThanOrEqual(Date.now());
    expect(record().takenAt).toBeGreaterThan(Date.now() - 60_000);

    lock.release();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("refuses a second tab through the same real storage", () => {
    const first = createStorageRefreshLock();
    const second = createStorageRefreshLock();

    expect(first.acquire()).toBe(true);
    expect(second.acquire()).toBe(false);
    expect(second.held()).toBe(true);

    first.release();
    expect(second.acquire()).toBe(true);
    second.release();
  });

  it("gives every tab its own owner id, so a reload cannot inherit a lock", () => {
    const ids = new Set<string>();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const lock = createStorageRefreshLock();
      expect(lock.acquire()).toBe(true);
      ids.add(record().id);
      lock.release();
    }
    // Three separately constructed defaults, three different owners: nothing
    // here may be a constant another tab can guess.
    expect(ids.size).toBe(3);
    expect([...ids].every((id) => id.length > 0)).toBe(true);
  });

  it("steals a stale record on the default ttl, which is two request timeouts", () => {
    const ttl = REQUEST_TIMEOUT_MS * 2;
    localStorage.setItem(
      KEY,
      JSON.stringify({ id: "tab-closed-mid-refresh", takenAt: Date.now() - ttl - 1 }),
    );

    const lock = createStorageRefreshLock();
    // Past the TTL the record is a corpse, not a holder: `held()` is what a
    // waiter loops on, so reading a dead tab as "still held" would stall every
    // other tab for the length of a timeout that has already expired.
    expect(lock.held()).toBe(false);
    expect(lock.acquire()).toBe(true);
    expect(record().id).not.toBe("tab-closed-mid-refresh");
    lock.release();
  });

  it("leaves a record that is only a moment old alone", () => {
    localStorage.setItem(KEY, JSON.stringify({ id: "tab-alive", takenAt: Date.now() - 1_000 }));

    const lock = createStorageRefreshLock();
    expect(lock.held()).toBe(true);
    expect(lock.acquire()).toBe(false);
    expect(record().id).toBe("tab-alive");
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

  it("runs without any lock at all", async () => {
    // The server render and any host without `window` land here: nothing to
    // serialise against, so the single-flight rule inside the tab still holds.
    const request = vi.fn(async () => pair);
    const coordinator = createRefreshCoordinator({ request, now: () => NOW });
    const [first, second] = await Promise.all([coordinator.refresh(), coordinator.refresh()]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(first.accessToken).toBe("rotated-access");
    expect(second).toEqual(first);
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

  it("refuses to rotate behind a tab that never finishes", async () => {
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

    // Wedged, not slow. Rotating anyway is the failure the lock exists to
    // prevent — two presentations of one family reads as theft and the tenant
    // revokes every session the customer holds — so this call fails out loud.
    await expect(coordinator.refresh()).rejects.toBeInstanceOf(RefreshLockedError);
    expect(request).not.toHaveBeenCalled();
    // Two bounded passes, five polls each: the wait before claiming the lock
    // and the wait after losing the claim. Nothing here is allowed to spin.
    expect(polls).toBe(10);
    // Nothing was spent: the other tab's record is exactly as it was.
    expect(JSON.parse(storage.map.get("nawy-refresh-lock-v1")!).id).toBe("tab-other");
    expect(coordinator.pending()).toBe(false);
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

  /*
   * The two tests above inject both the storage and the clock, which is the
   * only way to make a wedged tab reproducible. This one deliberately uses
   * neither: the guarantee that matters in a real browser — that two open tabs
   * never present the same refresh token family at the same time — is a
   * statement about real `localStorage` and real time, and it would survive a
   * rewrite that broke exactly that.
   */
  it("keeps two real tabs out of one rotation window", async () => {
    const timeline: string[] = [];

    function tab(id: string, holdMs: number): RefreshCoordinator {
      return createRefreshCoordinator({
        request: async () => {
          timeline.push(`${id}:start`);
          await new Promise((resolve) => setTimeout(resolve, holdMs));
          timeline.push(`${id}:end`);
          return pair;
        },
        lock: createStorageRefreshLock({ id }),
        pollMs: 5,
        maxWaitMs: REQUEST_TIMEOUT_MS * 2,
      });
    }

    const [first, second] = await Promise.all([tab("a", 40).refresh(), tab("b", 5).refresh()]);

    expect(first.accessToken).toBe("rotated-access");
    expect(second.accessToken).toBe("rotated-access");
    // Strictly one after the other — `b` waited for `a` rather than racing it.
    expect(timeline).toEqual(["a:start", "a:end", "b:start", "b:end"]);
    expect(localStorage.getItem("nawy-refresh-lock-v1")).toBeNull();
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

  /**
   * A refusal the way the API client actually throws one.
   *
   * Whether a failed refresh ends the session is decided by the status and the
   * domain code, not by the message, so a plain `new Error("RefreshToken...")`
   * would test a different contract than the one the app runs on.
   */
  function refusal(status: 401 | 409, code: AuthErrorCode): AppError {
    return new AppError({ kind: status === 401 ? "unauthorized" : "conflict", status, code });
  }

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
        throw refusal(401, "RefreshToken.Expired");
      },
    });
    const response = await authFetch("/api/v1/orders");
    // The customer sees the 401 they were given, and the session is over.
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(1);
    expect(signedOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the retry fails for anything that is not the token", async () => {
    // The deployed API answers every mediated call with a 500 right now.
    // Treating that as a dead token would sign every customer out on one bad
    // minute and then make them sign in again into the same bad minute.
    const outage = new AppError({ kind: "server", status: 500, code: null });
    const { authFetch, calls, signedOut } = harness(responder(401), {
      grant: fresh,
      refresh: async () => {
        throw outage;
      },
    });
    const response = await authFetch("/api/v1/orders");
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(1);
    expect(signedOut).not.toHaveBeenCalled();
  });

  it("does not send a request at all when the pre-flight refresh is refused", async () => {
    const denied = refusal(409, "RefreshToken.Invalid");
    const { authFetch, calls, signedOut } = harness(responder(200), {
      grant: null,
      refresh: async () => {
        throw denied;
      },
    });
    // The real refusal propagates, so the screen can name the case instead of
    // flattening every failure into one generic message.
    await expect(authFetch("/api/v1/orders")).rejects.toBe(denied);
    expect(calls).toHaveLength(0);
    expect(signedOut).toHaveBeenCalledTimes(1);
  });

  it("does not sign out over a pre-flight refresh it could not reach", async () => {
    const offline = new AppError({ kind: "offline", status: 0, code: null });
    const { authFetch, calls, signedOut } = harness(responder(200), {
      grant: null,
      refresh: async () => {
        throw offline;
      },
    });
    await expect(authFetch("/api/v1/orders")).rejects.toBe(offline);
    expect(calls).toHaveLength(0);
    expect(signedOut).not.toHaveBeenCalled();
  });

  it("does not sign out when another tab holds the refresh lock", async () => {
    const { authFetch, calls, signedOut } = harness(responder(200), {
      grant: null,
      refresh: async () => {
        throw new RefreshLockedError();
      },
    });
    await expect(authFetch("/api/v1/orders")).rejects.toBeInstanceOf(RefreshLockedError);
    expect(calls).toHaveLength(0);
    // A wedged sibling tab is a bad moment too: the customer's own cookie is
    // untouched, so the next attempt is a retry rather than a new sign-in.
    expect(signedOut).not.toHaveBeenCalled();
  });

  it("passes the body and method through untouched", async () => {
    const { authFetch, calls } = harness(responder(201), { grant: fresh });
    const response = await authFetch("/api/v1/addresses", { method: "POST", body: '{"title":"home"}' });
    expect(response.status).toBe(201);
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe('{"title":"home"}');
  });
});
