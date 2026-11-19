import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The handlers themselves are four lines each, and that is exactly why they are
 * worth a file: every rule they have to get right is about what they pass on —
 * the cookie header, the parsed body, the proxy's protocol — and a handler that
 * drops one of them does not throw. It quietly writes a session cookie over
 * plaintext, or forwards a token the page cached, or hands Next.js a promise it
 * never resolves.
 *
 * The upstream is stubbed at the same seam `auth-bff.test.ts` uses, so a route
 * failure here can only come from the route.
 */
vi.mock(import("@/lib/api"), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, forwardToTenant: vi.fn() };
});

import { forwardToTenant } from "@/lib/api";
import { REFRESH_COOKIE_NAME } from "@/lib/auth-cookie";
import { POST as attachSession } from "@/app/api/auth/session/route";
import { POST as refresh } from "@/app/api/auth/refresh/route";
import { POST as revoke } from "@/app/api/auth/revoke/route";
import { POST as verify } from "@/app/api/auth/otp/verify/route";

const forward = vi.mocked(forwardToTenant);

const INTERNAL_ORIGIN = "http://127.0.0.1:3000";
const VERIFY_URL = `${INTERNAL_ORIGIN}/api/auth/otp/verify`;
const REFRESH_URL = `${INTERNAL_ORIGIN}/api/auth/refresh`;
const REVOKE_URL = `${INTERNAL_ORIGIN}/api/auth/revoke`;
const SESSION_URL = `${INTERNAL_ORIGIN}/api/auth/session`;

const SESSION_DATA = {
  customerId: "cus-1",
  phoneNumber: "+201012345678",
  fullName: "Nawy Guest",
  email: null,
  accessToken: "access-1",
  tokenType: "Bearer",
  expiresIn: 3600,
  expiresAtUtc: "2026-11-05T11:00:00.000Z",
  refreshToken: "refresh-1",
};

const ROTATED_DATA = {
  accessToken: "access-2",
  tokenType: "Bearer",
  expiresIn: 3600,
  expiresAtUtc: "2026-11-05T12:00:00.000Z",
  refreshToken: "refresh-2",
  refreshTokenExpiresAtUtc: "2026-11-19T12:00:00.000Z",
};

function envelope(data: unknown, status = 200): unknown {
  return {
    statusCode: status,
    isSuccess: status === 200,
    data,
    errors: status === 200 ? null : { "RefreshToken.Invalid": "No." },
    timestamp: "2026-11-05T10:00:00.000Z",
  };
}

type Upstream = Awaited<ReturnType<typeof forwardToTenant>>;

function upstream(options: { status?: number; body?: unknown; retryAfterSeconds?: number | null } = {}): Upstream {
  return {
    status: options.status ?? 200,
    contentType: "application/json",
    body: options.body === undefined ? null : options.body,
    retryAfterSeconds: options.retryAfterSeconds ?? null,
  };
}

function post(
  url: string,
  {
    body,
    cookie,
    forwardedProto,
  }: { body?: BodyInit | null; cookie?: string; forwardedProto?: string } = {},
) {
  const headers = new Headers();
  if (typeof body === "string") headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  if (forwardedProto) headers.set("x-forwarded-proto", forwardedProto);
  return new Request(url, { method: "POST", body, headers });
}

function json(body: unknown): string {
  return JSON.stringify(body);
}

function jar(token: string): string {
  return `${REFRESH_COOKIE_NAME}=${token}`;
}

function setCookieLines(response: Response): string[] {
  return (response.headers.get("set-cookie") ?? "").split(", ").filter(Boolean);
}

async function textOf(response: Response): Promise<string> {
  return response.text();
}

beforeEach(() => {
  forward.mockReset();
});

afterEach(() => {
  vi.stubEnv("AUTH_MOCK", "");
  vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "");
});

describe("the auth routes never cache and never answer with a credential in the body", () => {
  it("leaves the render cache alone, because the config that used to opt out is now illegal", async () => {
    const routes = await Promise.all([
      import("@/app/api/auth/otp/verify/route"),
      import("@/app/api/auth/refresh/route"),
      import("@/app/api/auth/revoke/route"),
      import("@/app/api/auth/session/route"),
    ]);

    // `cacheComponents: true` makes `export const dynamic` a build error, and
    // these handlers are per-request anyway: they read the cookie, the proxy
    // headers, or the body. The assertion is a guard against re-adding it.
    for (const route of routes) expect(route).not.toHaveProperty("dynamic");
  });

  it("marks every answer no-store, including the refusals", async () => {
    forward.mockResolvedValue(upstream({ status: 500 }));

    const responses = await Promise.all([
      verify(post(VERIFY_URL, { body: json({ challengeId: "ch-1", code: "123456" }) })),
      refresh(post(REFRESH_URL, { cookie: jar("refresh-1") })),
      revoke(post(REVOKE_URL, { cookie: jar("refresh-1") })),
      attachSession(post(SESSION_URL, { body: json({ refreshToken: "refresh-1" }) })),
    ]);

    for (const response of responses) {
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("content-type")).toBe("application/json");
    }
  });
});

describe("POST /api/auth/otp/verify", () => {
  it("trades the code for a session and keeps the refresh token in the jar", async () => {
    forward.mockResolvedValue(upstream({ body: envelope(SESSION_DATA) }));

    const response = await verify(post(VERIFY_URL, { body: json({ challengeId: "ch-1", code: "123456" }) }));

    expect(response.status).toBe(200);
    const cookie = setCookieLines(response);
    expect(cookie).toHaveLength(1);
    expect(cookie[0]).toContain(`nawy_refresh=${SESSION_DATA.refreshToken}`);
    expect(cookie[0]).toContain("HttpOnly");
    // The cookie is the only carrier: nothing the page can parse holds the token.
    expect(JSON.stringify(await response.json())).not.toContain("refresh-1");
  });

  it("does not let a token the page still holds travel to the tenant inside a verify body", async () => {
    forward.mockResolvedValue(upstream({ body: envelope(SESSION_DATA) }));

    await verify(
      post(VERIFY_URL, { body: json({ challengeId: "ch-1", code: "123456", refreshToken: "refresh-stale" }) }),
    );

    expect(forward.mock.calls[0]?.[1]).toEqual({ body: { challengeId: "ch-1", code: "123456" } });
  });

  it("answers a body that is not JSON with its own refusal instead of a thrown parse error", async () => {
    const response = await verify(post(VERIFY_URL, { body: "<html>gateway timeout</html>" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ statusCode: 400, isSuccess: false });
    // Nothing was spent at the tenant for a request that could not be read.
    expect(forward).not.toHaveBeenCalled();
  });

  it("answers an empty body the same way, rather than hanging on a missing json()", async () => {
    const response = await verify(new Request(VERIFY_URL, { method: "POST" }));

    expect(response.status).toBe(400);
    expect(forward).not.toHaveBeenCalled();
  });

  it("writes a Secure jar when the proxy reports https, on an origin that looks plaintext", async () => {
    forward.mockResolvedValue(upstream({ body: envelope(SESSION_DATA) }));

    const response = await verify(
      post(VERIFY_URL, { body: json({ challengeId: "ch-1", code: "123456" }), forwardedProto: "https" }),
    );

    expect(setCookieLines(response)).toHaveLength(1);
    expect(setCookieLines(response)[0]).toContain("Secure");
  });

  it("passes the tenant's refusal through with its code and status intact", async () => {
    forward.mockResolvedValue(
      upstream({
        status: 429,
        body: envelope(null, 429),
        retryAfterSeconds: 180,
      }),
    );

    const response = await verify(post(VERIFY_URL, { body: json({ challengeId: "ch-1", code: "123456" }) }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("180");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("POST /api/auth/refresh", () => {
  it("reads the credential out of the cookie and forwards it as the whole body", async () => {
    forward.mockResolvedValue(upstream({ body: envelope(ROTATED_DATA) }));

    const response = await refresh(post(REFRESH_URL, { cookie: `theme=dark; ${jar("refresh-1")}` }));

    expect(forward.mock.calls[0]).toEqual(["/api/v1/auth/refresh", { body: { refreshToken: "refresh-1" } }]);
    expect(response.status).toBe(200);
    expect(setCookieLines(response)[0]).toContain("nawy_refresh=refresh-2");
    await expect(response.json()).resolves.toMatchObject({ data: { accessToken: "access-2" } });
  });

  it("never repeats the rotated token in the body, which is what makes rotation safe", async () => {
    forward.mockResolvedValue(upstream({ body: envelope(ROTATED_DATA) }));

    const response = await refresh(post(REFRESH_URL, { cookie: jar("refresh-1") }));

    expect(await textOf(response)).not.toContain("refresh-2");
  });

  it("refuses a request with no jar and wipes whatever variant an old one left behind", async () => {
    const response = await refresh(post(REFRESH_URL));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ errors: { "RefreshToken.Invalid": expect.any(String) } });
    expect(setCookieLines(response)).toHaveLength(2);
    expect(forward).not.toHaveBeenCalled();
  });

  it("treats an oversized cookie value as no session at all rather than forwarding a blob", async () => {
    const response = await refresh(post(REFRESH_URL, { cookie: jar("a".repeat(8193)) }));

    expect(response.status).toBe(401);
    expect(forward).not.toHaveBeenCalled();
  });

  it("clears the jar on any 401 from the tenant, so a dead family cannot be retried", async () => {
    forward.mockResolvedValue(upstream({ status: 401, body: envelope(null, 401) }));

    const response = await refresh(post(REFRESH_URL, { cookie: jar("refresh-1") }));

    expect(response.status).toBe(401);
    expect(setCookieLines(response)).toHaveLength(2);
  });

  it("leaves the jar alone on a 500, because a temporary failure is not a sign-out", async () => {
    forward.mockResolvedValue(upstream({ status: 500 }));

    const response = await refresh(post(REFRESH_URL, { cookie: jar("refresh-1") }));

    expect(response.status).toBe(500);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("POST /api/auth/revoke", () => {
  it("spends the token upstream and always drops the cookie afterwards", async () => {
    forward.mockResolvedValue(upstream({ body: envelope(null) }));

    const response = await revoke(post(REVOKE_URL, { cookie: jar("refresh-1") }));

    expect(forward.mock.calls[0]?.[1]).toEqual({ body: { refreshToken: "refresh-1", reason: "User logged out" } });
    expect(setCookieLines(response)).toHaveLength(2);
    expect(response.status).toBe(200);
  });

  it("drops the cookie even when the tenant fails, because a stuck logout is worse than a leaked token", async () => {
    forward.mockResolvedValue(upstream({ status: 500 }));

    const response = await revoke(post(REVOKE_URL, { cookie: jar("refresh-1") }));

    expect(response.status).toBe(500);
    expect(setCookieLines(response)).toHaveLength(2);
  });

  it("answers a browser with no jar as logged out, without spending anything", async () => {
    const response = await revoke(post(REVOKE_URL));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ statusCode: 200, isSuccess: true, data: null });
    expect(setCookieLines(response)).toHaveLength(2);
    expect(forward).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/session", () => {
  it("takes a legacy token out of storage into the jar and echoes nothing back", async () => {
    const response = await attachSession(post(SESSION_URL, { body: json({ refreshToken: "refresh-legacy" }) }));

    expect(response.status).toBe(204);
    expect(await textOf(response)).toBe("");
    expect(setCookieLines(response)[0]).toContain("nawy_refresh=refresh-legacy");
    expect(setCookieLines(response)[0]).toContain("HttpOnly");
    expect(forward).not.toHaveBeenCalled();
  });

  it("refuses a malformed or empty adoption body instead of writing an empty session", async () => {
    for (const body of [undefined, "not json", json({}), json({ refreshToken: "" })]) {
      const response = await attachSession(post(SESSION_URL, { body }));
      expect(response.status).toBe(400);
    }
    expect(forward).not.toHaveBeenCalled();
  });
});
