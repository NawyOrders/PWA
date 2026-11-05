import { describe, expect, it } from "vitest";
import {
  decodeSession,
  sessionFromPayload,
  sessionFromTokens,
  sessionIsExpired,
  sessionNeedsRefresh,
  type CustomerSession,
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
  refreshToken: "refresh-token",
};

const pair: TokenPair = {
  accessToken: "rotated-access",
  tokenType: "Bearer",
  expiresIn: 900,
  expiresAtUtc: new Date(NOW + 1_800_000).toISOString(),
  refreshToken: "rotated-refresh",
  refreshTokenExpiresAtUtc: null,
};

describe("sessionFromPayload", () => {
  it("keeps the customer identity and the expiry the server chose", () => {
    expect(sessionFromPayload(payload, NOW)).toEqual({
      customerId: "customer-1",
      phoneNumber: "+201012345678",
      fullName: "Nawy Guest",
      email: "guest@example.com",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      accessExpiresAt: NOW + 900_000,
    });
  });

  it("derives the expiry from expiresIn when the timestamp is unusable", () => {
    const session = sessionFromPayload({ ...payload, expiresAtUtc: "not-a-date" }, NOW);
    expect(session?.accessExpiresAt).toBe(NOW + 900_000);
  });

  it("ignores an expiry timestamp already in the past and falls back to expiresIn", () => {
    const session = sessionFromPayload(
      { ...payload, expiresAtUtc: new Date(NOW - 1000).toISOString(), expiresIn: 900 },
      NOW,
    );
    // a stale server timestamp must not discard a session the server just issued
    expect(session?.accessExpiresAt).toBe(NOW + 900_000);
  });

  it("marks a session with neither timestamp nor lifetime as stale", () => {
    const session = sessionFromPayload({ ...payload, expiresAtUtc: "", expiresIn: 0 }, NOW);
    expect(session?.accessExpiresAt).toBe(0);
    expect(sessionIsExpired(session as CustomerSession, NOW)).toBe(true);
  });

  it("drops a response with no usable expiry so it cannot live forever", () => {
    const session = sessionFromPayload({ ...payload, expiresIn: 0, expiresAtUtc: "" }, NOW);
    expect(session?.accessExpiresAt).toBe(0);
  });

  it("refuses a payload without both tokens", () => {
    expect(sessionFromPayload({ ...payload, accessToken: "" }, NOW)).toBeNull();
    expect(sessionFromPayload({ ...payload, refreshToken: "" }, NOW)).toBeNull();
    expect(sessionFromPayload({ ...payload, accessToken: undefined as unknown as string }, NOW)).toBeNull();
  });

  it("caps oversized strings instead of storing a megabyte of junk", () => {
    const session = sessionFromPayload({ ...payload, fullName: "x".repeat(5_000), email: "e".repeat(5_000) }, NOW);
    expect(session?.fullName).toHaveLength(120);
    expect(session?.email).toHaveLength(160);
  });

  it("normalises a missing email to null", () => {
    expect(sessionFromPayload({ ...payload, email: null }, NOW)?.email).toBeNull();
    expect(sessionFromPayload({ ...payload, email: "" }, NOW)?.email).toBeNull();
  });
});

describe("sessionFromTokens", () => {
  const session = sessionFromPayload(payload, NOW) as CustomerSession;

  it("rotates both tokens and keeps the customer identity", () => {
    expect(sessionFromTokens(session, pair, NOW)).toEqual({
      ...session,
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
      accessExpiresAt: NOW + 1_800_000,
    });
  });

  it("refuses a pair without tokens", () => {
    expect(sessionFromTokens(session, { ...pair, accessToken: "" }, NOW)).toBeNull();
    expect(sessionFromTokens(session, { ...pair, refreshToken: "" }, NOW)).toBeNull();
  });
});

describe("decodeSession", () => {
  const session = sessionFromPayload(payload, NOW) as CustomerSession;

  it("round-trips a session written by the app itself", () => {
    expect(decodeSession(JSON.parse(JSON.stringify(session)))).toEqual(session);
  });

  it("rejects anything that is not an object", () => {
    for (const value of [null, undefined, "token", 42, [], true]) expect(decodeSession(value)).toBeNull();
  });

  it("rejects an object without both tokens", () => {
    expect(decodeSession({ accessToken: "a" })).toBeNull();
    expect(decodeSession({ refreshToken: "r" })).toBeNull();
    expect(decodeSession({ accessToken: 7, refreshToken: 7 })).toBeNull();
  });

  it("ignores a tampered expiry instead of trusting it", () => {
    expect(decodeSession({ ...session, accessExpiresAt: "forever" })?.accessExpiresAt).toBe(0);
    expect(decodeSession({ ...session, accessExpiresAt: -5 })?.accessExpiresAt).toBe(0);
    expect(decodeSession({ ...session, accessExpiresAt: Number.NaN })?.accessExpiresAt).toBe(0);
  });

  it("keeps only a string email and truncates hostile fields", () => {
    const decoded = decodeSession({
      ...session,
      email: { nested: true },
      customerId: "c".repeat(500),
      phoneNumber: "p".repeat(500),
    });
    expect(decoded?.email).toBeNull();
    expect(decoded?.customerId).toHaveLength(64);
    expect(decoded?.phoneNumber).toHaveLength(32);
  });
});

describe("expiry helpers", () => {
  const session: CustomerSession = {
    customerId: "c",
    phoneNumber: "p",
    fullName: "n",
    email: null,
    accessToken: "a",
    refreshToken: "r",
    accessExpiresAt: NOW + 900_000,
  };

  it("reports expiry at and after the boundary", () => {
    expect(sessionIsExpired(session, NOW)).toBe(false);
    expect(sessionIsExpired(session, NOW + 900_000)).toBe(true);
    expect(sessionIsExpired({ ...session, accessExpiresAt: 0 }, NOW)).toBe(true);
  });

  it("refreshes a minute before the token actually dies", () => {
    expect(sessionNeedsRefresh(session, NOW + 300_000)).toBe(false);
    expect(sessionNeedsRefresh(session, NOW + 830_000)).toBe(false);
    // the boundary is inclusive: one minute left is already "refresh now"
    expect(sessionNeedsRefresh(session, NOW + 840_000)).toBe(true);
    expect(sessionNeedsRefresh(session, NOW + 850_000)).toBe(true);
  });

  it("treats a stale session as needing refresh", () => {
    expect(sessionNeedsRefresh({ ...session, accessExpiresAt: 0 }, NOW)).toBe(true);
  });

  it("honours a custom skew", () => {
    expect(sessionNeedsRefresh(session, NOW + 850_000, 0)).toBe(false);
    expect(sessionNeedsRefresh(session, NOW + 850_000, 120_000)).toBe(true);
  });
});
