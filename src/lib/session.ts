/**
 * The signed-in customer session.
 *
 * `nawy-auth-v1` stays as the demo flag (the app still runs with no backend
 * configured). Once the tenant API is configured, the real tokens live here
 * instead, and `loggedIn` is derived from "demo flag OR unexpired session".
 *
 * Tokens are read back from localStorage through `decodeSession`, so storage
 * is treated as untrusted input: wrong shapes, oversized strings and expired
 * tokens all collapse to `null`, which the app reads as "signed out".
 */

import type { CustomerSessionPayload, TokenPair } from "@/lib/api";

export type CustomerSession = {
  customerId: string;
  phoneNumber: string;
  fullName: string;
  email: string | null;
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which the access token stops being accepted. */
  accessExpiresAt: number;
};

/** A JWT is long; anything beyond this is not a token and will not be stored. */
const MAX_TOKEN_LENGTH = 8192;
const MAX_FIELD_LENGTH = 320;

function text(value: unknown, max = MAX_FIELD_LENGTH): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function expiryMs(expiresIn: number, expiresAtUtc: string, now: number): number {
  const fromUtc = Date.parse(expiresAtUtc);
  if (Number.isFinite(fromUtc) && fromUtc > now) return fromUtc;
  if (Number.isFinite(expiresIn) && expiresIn > 0) return now + expiresIn * 1000;
  // No usable expiry: treat the session as already stale so it gets refreshed
  // or dropped instead of silently living forever in storage.
  return 0;
}

export function sessionFromPayload(payload: CustomerSessionPayload, now = Date.now()): CustomerSession | null {
  const accessToken = text(payload.accessToken, MAX_TOKEN_LENGTH);
  const refreshToken = text(payload.refreshToken, MAX_TOKEN_LENGTH);
  if (!accessToken || !refreshToken) return null;
  return {
    customerId: text(payload.customerId, 64),
    phoneNumber: text(payload.phoneNumber, 32),
    fullName: text(payload.fullName, 120),
    email: payload.email ? text(payload.email, 160) : null,
    accessToken,
    refreshToken,
    accessExpiresAt: expiryMs(payload.expiresIn, payload.expiresAtUtc, now),
  };
}

/** Refreshing rotates both tokens, so the pair replaces the session wholesale. */
export function sessionFromTokens(
  session: CustomerSession,
  pair: TokenPair,
  now = Date.now(),
): CustomerSession | null {
  const accessToken = text(pair.accessToken, MAX_TOKEN_LENGTH);
  const refreshToken = text(pair.refreshToken, MAX_TOKEN_LENGTH);
  if (!accessToken || !refreshToken) return null;
  return {
    ...session,
    accessToken,
    refreshToken,
    accessExpiresAt: expiryMs(pair.expiresIn, pair.expiresAtUtc, now),
  };
}

export function decodeSession(value: unknown): CustomerSession | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Record<string, unknown>;
  const accessToken = text(stored.accessToken, MAX_TOKEN_LENGTH);
  const refreshToken = text(stored.refreshToken, MAX_TOKEN_LENGTH);
  if (!accessToken || !refreshToken) return null;
  const expiresAt = typeof stored.accessExpiresAt === "number" ? stored.accessExpiresAt : 0;
  return {
    customerId: text(stored.customerId, 64),
    phoneNumber: text(stored.phoneNumber, 32),
    fullName: text(stored.fullName, 120),
    email: typeof stored.email === "string" ? text(stored.email, 160) : null,
    accessToken,
    refreshToken,
    accessExpiresAt: Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : 0,
  };
}

export function sessionIsExpired(session: CustomerSession, now = Date.now()): boolean {
  return session.accessExpiresAt <= now;
}

/**
 * True when the access token is gone or close enough to gone that the next
 * screen would be served a 401. Refreshing a minute early keeps the customer
 * from seeing it.
 */
export function sessionNeedsRefresh(session: CustomerSession, now = Date.now(), skewMs = 60_000): boolean {
  return session.accessExpiresAt - skewMs <= now;
}
