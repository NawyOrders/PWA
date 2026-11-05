/**
 * Customer session: who is signed in, and what may be said about them.
 *
 * The two halves are deliberately separate, because they are stored in
 * different places.
 *
 *   - `CustomerSession` is *identity* (id, phone, name, email) and nothing
 *     else. It is what survives a reload, so it is the only thing that may live
 *     in `localStorage`.
 *   - `AccessGrant` is the bearer token. It lives in memory only: a JWT in
 *     storage is readable by any script on the origin, and the refresh cookie
 *     can mint a new one at any time, so there is nothing to gain from keeping
 *     it there.
 *   - The refresh token never appears in this file at all. The BFF routes in
 *     `src/app/api/auth/*` hold it in an httpOnly cookie, and rotation happens
 *     inside the cookie jar, out of JavaScript's reach.
 *
 * Storage is untrusted input, so every read is defensive: wrong shapes,
 * oversized strings and expired grants collapse to `null`, which the app reads
 * as "signed out".
 */

import { MAX_TOKEN_LENGTH, REQUEST_TIMEOUT_MS, isFatalRefreshError } from "@/lib/api";
import type { CustomerSessionPayload, TokenPair } from "@/lib/api";

export type CustomerSession = {
  customerId: string;
  phoneNumber: string;
  fullName: string;
  email: string | null;
};

export type AccessGrant = {
  accessToken: string;
  /** Epoch milliseconds at which the access token stops being accepted. */
  accessExpiresAt: number;
};

/** The shared token ceiling, so the cookie jar and this store refuse the same size. */
const MAX_FIELD_LENGTH = 320;

function text(value: unknown, max = MAX_FIELD_LENGTH): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/**
 * Reads a token, or refuses to hold one.
 *
 * A token is opaque, so the only checks that make sense are shape checks: it is
 * a string, it is not absurdly large, and it has no whitespace in it. Truncating
 * instead of refusing would keep a corrupted value that authenticates as
 * nothing and fails as a confusing 401 much later, and whitespace is a header
 * injection risk the moment it is pasted into `Authorization`.
 */
function bearerToken(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TOKEN_LENGTH || /[\s]/.test(trimmed)) return "";
  return trimmed;
}

function expiryMs(expiresIn: number, expiresAtUtc: string, now: number): number {
  const fromUtc = Date.parse(expiresAtUtc);
  if (Number.isFinite(fromUtc) && fromUtc > now) return fromUtc;
  if (Number.isFinite(expiresIn) && expiresIn > 0) return now + expiresIn * 1000;
  // No usable expiry: treat the grant as already stale so it gets refreshed or
  // dropped instead of silently living forever.
  return 0;
}

export function identityFromPayload(payload: CustomerSessionPayload): CustomerSession {
  return {
    customerId: text(payload.customerId, 64),
    phoneNumber: text(payload.phoneNumber, 32),
    fullName: text(payload.fullName, 120),
    email: payload.email ? text(payload.email, 160) : null,
  };
}

export function grantFromPayload(payload: CustomerSessionPayload, now = Date.now()): AccessGrant | null {
  const accessToken = bearerToken(payload.accessToken);
  if (!accessToken) return null;
  return { accessToken, accessExpiresAt: expiryMs(payload.expiresIn, payload.expiresAtUtc, now) };
}

/** Rotation replaces the grant wholesale; the identity does not change. */
export function grantFromTokens(pair: TokenPair, now = Date.now()): AccessGrant | null {
  const accessToken = bearerToken(pair.accessToken);
  if (!accessToken) return null;
  return { accessToken, accessExpiresAt: expiryMs(pair.expiresIn, pair.expiresAtUtc, now) };
}

/**
 * Reads the persisted identity.
 *
 * Sessions stored before the refresh token moved into a cookie carry their own
 * copies of both tokens. They are ignored here, and `legacyRefreshToken` reports
 * the one that is still worth adopting — the app hands it to the BFF once, then
 * the storage copy is overwritten with identity only.
 */
export type StoredSession = {
  identity: CustomerSession;
  legacyRefreshToken: string | null;
};

export function decodeSession(value: unknown): StoredSession | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Record<string, unknown>;
  const customerId = text(stored.customerId, 64);
  const phoneNumber = text(stored.phoneNumber, 32);
  if (!customerId && !phoneNumber) return null;
  return {
    identity: {
      customerId,
      phoneNumber,
      fullName: text(stored.fullName, 120),
      email: typeof stored.email === "string" ? text(stored.email, 160) : null,
    },
    legacyRefreshToken: bearerToken(stored.refreshToken) || null,
  };
}

/** Shape kept for callers that only want the identity. */
export function decodeIdentity(value: unknown): CustomerSession | null {
  return decodeSession(value)?.identity ?? null;
}

export function sessionIsExpired(grant: AccessGrant | null, now = Date.now()): boolean {
  return grant === null || grant.accessExpiresAt <= now;
}

/**
 * True when the access token is gone or close enough to gone that the next
 * screen would be served a 401. Refreshing a minute early keeps the customer
 * from seeing it.
 */
export function sessionNeedsRefresh(grant: AccessGrant | null, now = Date.now(), skewMs = 60_000): boolean {
  return grant === null || grant.accessExpiresAt - skewMs <= now;
}

/* -------------------------------------------------------------------------- */
/* Single-flight refresh                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `/refresh` rotates the token every time it succeeds, and reusing a rotated
 * token is treated as theft: the whole family is revoked and everybody has to
 * sign in again. Two tabs refreshing at once — or two requests in one tab — is
 * therefore not an optimisation to avoid but a bug that logs the customer out.
 *
 * So: one refresh per tab (a shared promise) and one per browser (a lock in
 * `localStorage`, which is the only storage primitive every target shares).
 */
export type RefreshLock = {
  /** Claim the lock. False when another live holder owns it. */
  acquire: () => boolean;
  release: () => void;
  /** True while any holder — including this one — has it claimed. */
  held: () => boolean;
};

/**
 * A lock has to outlive the request it guards, by a clear margin.
 *
 * The refresh call itself is abandoned at `REQUEST_TIMEOUT_MS`; a lock that
 * expired before that would let a second tab rotate the same token family while
 * the first is still waiting for its answer, and the backend reads two
 * presentations of one family as theft — revoking every session the customer
 * has. Two timeouts is the smallest number that cannot be reached by a normal
 * slow response.
 */
const LOCK_TTL_MS = REQUEST_TIMEOUT_MS * 2;

/** Another tab holds the refresh lock and will not give it up. */
export class RefreshLockedError extends Error {
  constructor() {
    super("refresh-locked");
    this.name = "RefreshLockedError";
  }
}

function randomOwnerId(): string {
  const cryptoSource = globalThis.crypto as Crypto | undefined;
  if (cryptoSource?.randomUUID) return cryptoSource.randomUUID();
  return `tab-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The lock is a record, not a mutex: `acquire` writes its own id and re-reads,
 * so two tabs that claim at the same instant both see the winner's id and only
 * one of them proceeds. A holder that never released — a closed tab — expires
 * with the TTL, which keeps a crashed tab from signing nobody back in ever.
 */
export function createStorageRefreshLock(options: {
  key?: string;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  ttlMs?: number;
  now?: () => number;
  id?: string;
} = {}): RefreshLock {
  const key = options.key ?? "nawy-refresh-lock-v1";
  const ttlMs = options.ttlMs ?? LOCK_TTL_MS;
  const now = options.now ?? (() => Date.now());
  const id = options.id ?? randomOwnerId();
  const storage =
    options.storage !== undefined && options.storage !== null
      ? options.storage
      : typeof globalThis.localStorage !== "undefined"
        ? globalThis.localStorage
        : null;

  function read(): { id: string; takenAt: number } | null {
    if (!storage) return null;
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: unknown; takenAt?: unknown };
      if (typeof parsed.id !== "string" || typeof parsed.takenAt !== "number") return null;
      return { id: parsed.id, takenAt: parsed.takenAt };
    } catch {
      return null;
    }
  }

  return {
    acquire() {
      // No storage means no other tab can be seen, which in a single-tab world
      // is exactly "uncontended": keep the lock interface and let the caller in.
      if (!storage) return true;
      const current = read();
      if (current && current.id !== id && now() - current.takenAt < ttlMs) return false;
      try {
        storage.setItem(key, JSON.stringify({ id, takenAt: now() }));
      } catch {
        return true;
      }
      return read()?.id === id;
    },
    release() {
      if (!storage) return;
      if (read()?.id !== id) return;
      try {
        storage.removeItem(key);
      } catch {
        // A storage that refuses to delete still cannot trap this tab: the
        // record expires on its own and any later holder waits it out.
      }
    },
    held() {
      const current = read();
      return current !== null && current.id !== id && now() - current.takenAt < ttlMs;
    },
  };
}

export type RefreshCoordinator = {
  /** Refresh, or join the refresh already running. Never two at a time. */
  refresh: () => Promise<AccessGrant>;
  /** True while a refresh is running in *this* tab. */
  pending: () => boolean;
};

/**
 * One refresh at a time, shared by every caller in the tab and serialised
 * against every other tab.
 *
 * A tab that finds the lock held waits for it and then refreshes for itself:
 * the token another tab just minted lives in that tab's memory, so waiting for
 * the lock is about not clobbering the cookie, not about borrowing the result.
 */
export function createRefreshCoordinator(options: {
  request: () => Promise<TokenPair>;
  onRotated?: (grant: AccessGrant) => void;
  lock?: RefreshLock | null;
  /** Injected for tests; a real browser polls, which is cheap and bounded. */
  wait?: (ms: number) => Promise<void>;
  maxWaitMs?: number;
  pollMs?: number;
  now?: () => number;
}): RefreshCoordinator {
  const lock = options.lock ?? null;
  const pollMs = options.pollMs ?? 100;
  // A waiter gives up exactly when the record it is waiting on is old enough to
  // be stolen, so "the other tab is wedged" and "the other tab died" take the
  // same amount of time to resolve.
  const maxWaitMs = options.maxWaitMs ?? LOCK_TTL_MS;
  const wait =
    options.wait ??
    ((ms: number) => new Promise<void>((resolve) => globalThis.setTimeout(resolve, ms)));
  const now = options.now ?? (() => Date.now());

  let inflight: Promise<AccessGrant> | null = null;

  /**
   * Gives up after `maxWaitMs` so a tab that died mid-refresh cannot wedge the
   * others. The poll count is a second bound: a clock that stands still — a
   * fake timer in a test, a throttled background tab — would otherwise keep the
   * deadline check true forever and spin this loop.
   */
  const maxPolls = Math.max(1, Math.ceil(maxWaitMs / Math.max(pollMs, 1)));

  async function waitForOtherTabs(): Promise<void> {
    const deadline = now() + maxWaitMs;
    let polls = 0;
    while (lock?.held() && now() < deadline && polls < maxPolls) {
      polls += 1;
      await wait(pollMs);
    }
  }

  async function run(): Promise<AccessGrant> {
    await waitForOtherTabs();
    if (lock && !lock.acquire()) {
      // Lost the race for the same window; the winner is on it, so wait for the
      // lock to clear rather than firing a second rotation behind its back.
      await waitForOtherTabs();
      if (lock.held()) {
        // Still held means the other tab is wedged, not slow. Rotating anyway
        // is the exact failure this lock exists to prevent — two presentations
        // of one family a second apart reads as theft, and the tenant revokes
        // every session the customer holds. Failing is recoverable: nothing was
        // spent, the cookie is untouched, and the next attempt is a retry.
        throw new RefreshLockedError();
      }
    }
    try {
      const pair = await options.request();
      const grant = grantFromTokens(pair, now());
      if (!grant) throw new Error("refresh-token-invalid-response");
      options.onRotated?.(grant);
      return grant;
    } finally {
      lock?.release();
    }
  }

  return {
    refresh() {
      if (inflight) return inflight;
      const task = run().finally(() => {
        if (inflight === task) inflight = null;
      });
      inflight = task;
      return task;
    },
    pending() {
      return inflight !== null;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Authenticated fetch                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A `fetch` for tenant endpoints that need the bearer token.
 *
 * It reads the grant from a getter rather than a copy, refreshes at most once
 * per call, retries at most once, and gives up out loud (`onSignedOut`) if the
 * refreshed token is still refused. The counters are what make this safe: an
 * endpoint that always answers 401 must not turn into a retry loop.
 */
export type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;

export function createAuthFetch(options: {
  getGrant: () => AccessGrant | null;
  refresh: () => Promise<AccessGrant>;
  onSignedOut: () => void;
  /** Paths are taken relative to the tenant API; absolute URLs pass through. */
  join?: (path: string) => string;
  fetchImpl?: typeof globalThis.fetch;
  /** Injected for tests, like the coordinator's clock. */
  now?: () => number;
}): AuthFetch {
  const call = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const join = options.join ?? ((path: string) => path);
  const now = options.now ?? (() => Date.now());

  async function signed(path: string, grant: AccessGrant, init: RequestInit = {}) {
    const headers = new Headers(init.headers ?? {});
    headers.set("Authorization", `Bearer ${grant.accessToken}`);
    return call(join(path), { ...init, headers, credentials: "omit" });
  }

  return async function authFetch(input, init = {}) {
    let grant = options.getGrant();
    if (!grant || sessionNeedsRefresh(grant, now())) {
      try {
        grant = await options.refresh();
      } catch (error) {
        // Only the backend saying "that token is dead" ends the session. An
        // outage, an offline browser or a locked refresh is this call failing,
        // not the customer being signed out — and wiping the identity here would
        // turn one bad minute into a lost session.
        if (isFatalRefreshError(error)) options.onSignedOut();
        throw error;
      }
    }

    let response = await signed(input, grant, init);
    if (response.status !== 401) return response;

    try {
      grant = await options.refresh();
    } catch (error) {
      if (isFatalRefreshError(error)) options.onSignedOut();
      return response;
    }

    response = await signed(input, grant, init);
    if (response.status === 401) options.onSignedOut();
    return response;
  };
}
