import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The upstream is the only thing here that is not ours to decide, so it is the
 * only thing stubbed: every branch below is driven by the exact shape
 * `forwardToTenant` documents. The real module still supplies the two ceilings
 * `auth-cookie` imports, because a mock that hid them would let the cookie jar
 * and the client disagree about token length without a single test noticing.
 */
vi.mock(import("@/lib/api"), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, forwardToTenant: vi.fn() };
});

import { forwardToTenant } from "@/lib/api";
import {
  bffAttach,
  bffCompleteProfile,
  bffRefresh,
  bffRequest,
  bffRequestOtp,
  bffResponse,
  bffRevoke,
  bffVerify,
  type BffResult,
} from "@/lib/auth-bff";

const forward = vi.mocked(forwardToTenant);

const HTTPS_ORIGIN = "https://shop.example/api/auth/otp/verify";
const DEV_ORIGIN = "http://localhost:3000/api/auth/otp/verify";
const LAN_ORIGIN = "http://192.168.1.20:3000/api/auth/otp/verify";

const OTP_REQUEST_PATH = "/api/v1/auth/otp/request";
const VERIFY_PATH = "/api/v1/auth/otp/verify";
const REFRESH_PATH = "/api/v1/auth/refresh";
const REVOKE_PATH = "/api/v1/auth/revoke";

/** Fourteen days, the ceiling the cookie module agrees to. */
const COOKIE_MAX_AGE = 14 * 86_400;

type Envelope = {
  statusCode: number;
  isSuccess: boolean;
  data: Record<string, unknown> | null;
  errors: Record<string, string> | null;
  timestamp: string;
};

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

/** The tenant API's envelope, exactly as `forwardToTenant` hands the parsed body over. */
function envelope(data: unknown, options: { statusCode?: number; isSuccess?: boolean; errors?: unknown } = {}): Envelope {
  return {
    statusCode: options.statusCode ?? 200,
    isSuccess: options.isSuccess ?? true,
    data: data as Envelope["data"],
    errors: (options.errors ?? null) as Envelope["errors"],
    timestamp: "2026-11-05T10:00:00.000Z",
  };
}

function upstream(options: {
  status?: number;
  body?: unknown;
  retryAfterSeconds?: number | null;
}): Awaited<ReturnType<typeof forwardToTenant>> {
  return {
    status: options.status ?? 200,
    contentType: "application/json",
    body: options.body === undefined ? null : options.body,
    retryAfterSeconds: options.retryAfterSeconds ?? null,
  };
}

function dataOf(result: BffResult): Record<string, unknown> {
  const body = result.body as Envelope;
  expect(body.data).toBeTypeOf("object");
  return body.data as Record<string, unknown>;
}

function envelopeOf(result: BffResult): Envelope {
  expect(result.body).toBeTypeOf("object");
  return result.body as Envelope;
}

async function readBody(response: Response): Promise<string> {
  return response.text();
}

beforeEach(() => {
  // The factory's mock is shared by the whole file; implementations must not
  // leak from one branch to the next.
  forward.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubEnv("AUTH_MOCK", "");
  vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "");
});

describe("bffRequestOtp — relay the anonymous challenge request", () => {
  it("forwards only the documented fields and relays the envelope with no cookie", async () => {
    const answer = envelope({ challengeId: "ch-1", expiresInSeconds: 300 });
    forward.mockResolvedValue(upstream({ body: answer }));

    const result = await bffRequestOtp({
      body: { phoneNumber: "+201012345678", purpose: "Login", channel: "Sms", tenantId: "nawy" },
      origin: HTTPS_ORIGIN,
    });

    expect(forward).toHaveBeenCalledTimes(1);
    expect(forward.mock.calls[0]?.[0]).toBe(OTP_REQUEST_PATH);
    expect(forward.mock.calls[0]?.[1]).toEqual({
      body: { phoneNumber: "+201012345678", channel: "Sms" },
    });
    expect(result).toMatchObject({ status: 200, cookie: null });
    expect(result.body).toBe(answer);
  });

  it("refuses a body that is not an object without asking the tenant", async () => {
    const result = await bffRequestOtp({ body: null, origin: HTTPS_ORIGIN });

    expect(result).toMatchObject({ status: 400, cookie: null });
    expect(forward).not.toHaveBeenCalled();
  });

  it("refuses a missing phone number without asking the tenant", async () => {
    const result = await bffRequestOtp({ body: { channel: "Sms" }, origin: HTTPS_ORIGIN });

    expect(result).toMatchObject({ status: 400, cookie: null });
    expect(forward).not.toHaveBeenCalled();
  });

  it("passes a 429 through with its Retry-After and writes no cookie", async () => {
    const failure = envelope(null, {
      statusCode: 429,
      isSuccess: false,
      errors: { "Auth.OtpRateLimitExceeded": "Slow down." },
    });
    forward.mockResolvedValue(upstream({ status: 429, body: failure, retryAfterSeconds: 180 }));

    const result = await bffRequestOtp({ body: { phoneNumber: "+201012345678" }, origin: HTTPS_ORIGIN });

    expect(result).toMatchObject({ status: 429, retryAfterSeconds: 180, cookie: null });
    expect(result.body).toBe(failure);
  });

  it("strips a refresh token even though this endpoint should never carry one", async () => {
    forward.mockResolvedValue(
      upstream({ body: envelope({ challengeId: "ch-1", refreshToken: "refresh-leak" }) }),
    );

    const result = await bffRequestOtp({ body: { phoneNumber: "+201012345678" }, origin: HTTPS_ORIGIN });

    expect(dataOf(result)).not.toHaveProperty("refreshToken");
    expect(JSON.stringify(result.body)).not.toContain("refresh-leak");
  });
});

describe("bffVerify — take the token off the response and hide it", () => {
  it("moves the refresh token from the body the page reads into the httpOnly jar", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...SESSION_DATA }) }));

    const result = await bffVerify({
      body: { challengeId: "ch-1", code: "123456" },
      origin: HTTPS_ORIGIN,
    });

    expect(result.status).toBe(200);
    expect(result.cookie).toMatchObject({
      name: "nawy_refresh",
      value: "refresh-1",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: COOKIE_MAX_AGE,
    });
    expect(dataOf(result)).toMatchObject({ accessToken: "access-1", customerId: "cus-1", tokenType: "Bearer" });
    expect(dataOf(result)).not.toHaveProperty("refreshToken");
    // The strongest statement the boundary allows: the secret is nowhere in what
    // the page receives, not merely moved to another field.
    expect(JSON.stringify(result.body)).not.toContain("refresh-1");
  });

  it("forwards the challenge and the code, and nothing else the page might have kept", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...SESSION_DATA }) }));

    await bffVerify({
      // An older build could post its stored token or the name it used to send
      // with verify; neither may reach the tenant as part of a verify body.
      body: { challengeId: "ch-1", code: "123456", fullName: "Nawy Guest", refreshToken: "refresh-stale" },
      origin: HTTPS_ORIGIN,
    });

    expect(forward).toHaveBeenCalledTimes(1);
    expect(forward.mock.calls[0]?.[0]).toBe(VERIFY_PATH);
    expect(forward.mock.calls[0]?.[1]).toEqual({ body: { challengeId: "ch-1", code: "123456" } });
  });

  it("keeps the whole envelope the tenant sent on a failure, because the client names the error itself", async () => {
    const failure = envelope(null, {
      statusCode: 404,
      isSuccess: false,
      errors: { "Customer.ChallengeNotFound": "The verification challenge does not exist." },
    });
    forward.mockResolvedValue(upstream({ status: 404, body: failure }));

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: HTTPS_ORIGIN });

    expect(result.status).toBe(404);
    expect(result.body).toBe(failure);
    expect(envelopeOf(result).errors).toEqual({ "Customer.ChallengeNotFound": expect.any(String) });
    expect(result.cookie).toBeNull();
  });

  it("passes a 429 through with its Retry-After and writes no cookie, so the countdown survives the hop", async () => {
    const failure = envelope(null, { statusCode: 429, isSuccess: false, errors: { "Auth.OtpRateLimitExceeded": "Slow down." } });
    forward.mockResolvedValue(upstream({ status: 429, body: failure, retryAfterSeconds: 180 }));

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: HTTPS_ORIGIN });

    expect(result).toMatchObject({ status: 429, retryAfterSeconds: 180, cookie: null });
    expect(result.body).toBe(failure);
  });

  it("leaves an existing session untouched when a verify fails, because the old cookie is still the old session", async () => {
    forward.mockResolvedValue(
      upstream({ status: 422, body: envelope(null, { statusCode: 422, isSuccess: false, errors: { Code: "Wrong." } }) }),
    );

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "000000" }, origin: HTTPS_ORIGIN });

    expect(result.cookie).toBeNull();
    expect(result.retryAfterSeconds).toBeNull();
  });

  it("refuses to sign a customer in with nothing to refresh, rather than a session that dies silently", async () => {
    const { refreshToken: _hidden, ...noToken } = SESSION_DATA;
    forward.mockResolvedValue(upstream({ body: envelope(noToken) }));

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: HTTPS_ORIGIN });

    expect(result.status).toBe(502);
    expect(result.cookie).toBeNull();
  });

  it("strips a refused token from the 502 as well, so no path relays a credential to the page", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...SESSION_DATA, refreshToken: "a".repeat(8193) }) }));

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: HTTPS_ORIGIN });

    // The token was too long to store, so nothing is written — but the answer
    // still contains it, and the page must never see it.
    expect(result.status).toBe(502);
    expect(result.cookie).toBeNull();
    expect(dataOf(result)).not.toHaveProperty("refreshToken");
    expect(JSON.stringify(result.body)).not.toContain("aaaa");
  });

  it("passes a 200 that never claimed success through as it came, minus any credential in it", async () => {
    const notSuccess = envelope({ ...SESSION_DATA }, { isSuccess: false });
    forward.mockResolvedValue(upstream({ status: 200, body: notSuccess }));

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: HTTPS_ORIGIN });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ statusCode: 200, isSuccess: false });
    expect(result.cookie).toBeNull();
    // An answer that does not even claim success is still an answer, and no
    // answer may hand a refresh token to JavaScript.
    expect(JSON.stringify(result.body)).not.toContain("refresh-1");
    expect(dataOf(result)).not.toHaveProperty("refreshToken");
  });

  it("passes a 200 whose body is not an envelope at all straight through, inventing nothing", async () => {
    // A proxy or an HTML error page answers this way; the BFF's job is to relay,
    // not to reinterpret a body it cannot read.
    forward.mockResolvedValue(upstream({ status: 200, body: "Service unavailable" }));

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: HTTPS_ORIGIN });

    expect(result.status).toBe(200);
    expect(result.body).toBe("Service unavailable");
    expect(result.cookie).toBeNull();
  });

  it("refuses to read a session out of a success envelope whose data is not an object", async () => {
    forward.mockResolvedValue(upstream({ status: 200, body: envelope("refresh-1") }));

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: HTTPS_ORIGIN });

    expect(result.status).toBe(200);
    expect(result.cookie).toBeNull();
  });

  it("answers an empty success with the envelope the client reads instead of a bare 204", async () => {
    forward.mockResolvedValue(upstream({ status: 204 }));

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: HTTPS_ORIGIN });

    expect(result.status).toBe(204);
    expect(envelopeOf(result)).toMatchObject({ statusCode: 204, isSuccess: true, data: null, errors: null });
    expect(result.cookie).toBeNull();
  });

  it("keeps the status of the unparseable 500 the deployed API returns today, so the catalog can still name it", async () => {
    forward.mockResolvedValue(upstream({ status: 500 }));

    const result = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: HTTPS_ORIGIN });

    expect(result.status).toBe(500);
    expect(envelopeOf(result)).toMatchObject({ statusCode: 500, isSuccess: false, data: null, errors: null });
  });

  it("refuses a body that is not a JSON object before spending anything at the tenant", async () => {
    for (const body of [null, undefined, "challenge-1", ["a"], 42]) {
      const result = await bffVerify({ body, origin: HTTPS_ORIGIN });
      expect(result).toMatchObject({ status: 400, cookie: null, retryAfterSeconds: null });
      expect(envelopeOf(result).errors).toEqual({ "Validation.Failed": expect.any(String) });
    }
    expect(forward).not.toHaveBeenCalled();
  });

  it("marks the jar Secure over https and localhost, but not over a LAN address on plain http", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...SESSION_DATA }) }));

    await expect(bffVerify({ body: { challengeId: "ch-1" }, origin: DEV_ORIGIN })).resolves.toMatchObject({
      cookie: { secure: true },
    });
    await expect(bffVerify({ body: { challengeId: "ch-1" }, origin: LAN_ORIGIN })).resolves.toMatchObject({
      cookie: { secure: false },
    });
  });
});

describe("bffRefresh — rotate where the token actually lives", () => {
  it("refuses to rotate a session the browser did not present, and wipes any old cookie anyway", async () => {
    const result = await bffRefresh({ token: null, origin: HTTPS_ORIGIN });

    expect(result).toMatchObject({ status: 401, retryAfterSeconds: null });
    expect(envelopeOf(result).errors).toEqual({ "RefreshToken.Invalid": expect.any(String) });
    expect(result.cookie).toMatchObject({ value: "", maxAge: 0, httpOnly: true });
    expect(forward).not.toHaveBeenCalled();
  });

  it("writes the rotated token to the jar and keeps it out of the body, which is why rotation is safe here", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...ROTATED_DATA }) }));

    const result = await bffRefresh({ token: "refresh-1", origin: HTTPS_ORIGIN });

    expect(forward.mock.calls[0]).toEqual([REFRESH_PATH, { body: { refreshToken: "refresh-1" } }]);
    expect(result.status).toBe(200);
    expect(result.cookie).toMatchObject({ value: "refresh-2", maxAge: COOKIE_MAX_AGE, secure: true });
    expect(dataOf(result)).toMatchObject({
      accessToken: "access-2",
      refreshTokenExpiresAtUtc: "2026-11-19T12:00:00.000Z",
    });
    expect(dataOf(result)).not.toHaveProperty("refreshToken");
    expect(JSON.stringify(result.body)).not.toContain("refresh-2");
  });

  it("clears the cookie on any 401, because expired, revoked and reuse-detected all mean sign in again", async () => {
    const stolen = envelope(null, { statusCode: 401, isSuccess: false, errors: { "RefreshToken.CompromisedReuse": "Replay." } });
    forward.mockResolvedValue(upstream({ status: 401, body: stolen }));

    const result = await bffRefresh({ token: "refresh-old", origin: HTTPS_ORIGIN });

    expect(result.status).toBe(401);
    expect(result.body).toBe(stolen);
    expect(result.cookie).toMatchObject({ value: "", maxAge: 0 });
  });

  it("leaves the cookie alone when the fault is the tenant's, not the customer's", async () => {
    forward.mockResolvedValue(upstream({ status: 500 }));

    const result = await bffRefresh({ token: "refresh-1", origin: HTTPS_ORIGIN });

    expect(result.status).toBe(500);
    expect(result.cookie).toBeNull();
    expect(envelopeOf(result)).toMatchObject({ statusCode: 500, isSuccess: false });
  });

  it("reports a rotation answer with no token as a bad gateway rather than caching a dead session", async () => {
    const { refreshToken: _hidden, ...noToken } = ROTATED_DATA;
    forward.mockResolvedValue(upstream({ body: envelope(noToken) }));

    const result = await bffRefresh({ token: "refresh-1", origin: HTTPS_ORIGIN });

    expect(result.status).toBe(502);
    expect(result.cookie).toBeNull();
  });

  it("strips an unusable rotated token from the 502 on the refresh path too", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...ROTATED_DATA, refreshToken: "a".repeat(8193) }) }));

    const result = await bffRefresh({ token: "refresh-1", origin: HTTPS_ORIGIN });

    expect(result.status).toBe(502);
    expect(result.cookie).toBeNull();
    expect(dataOf(result)).not.toHaveProperty("refreshToken");
    expect(JSON.stringify(result.body)).not.toContain("aaaa");
  });

  it("passes a 200 whose envelope says failure through, with the token still taken out", async () => {
    const notSuccess = envelope({ ...ROTATED_DATA }, { isSuccess: false });
    forward.mockResolvedValue(upstream({ status: 200, body: notSuccess }));

    const result = await bffRefresh({ token: "refresh-1", origin: HTTPS_ORIGIN });

    expect(result).toMatchObject({ status: 200, cookie: null });
    expect(result.body).toMatchObject({ statusCode: 200, isSuccess: false });
    expect(JSON.stringify(result.body)).not.toContain("refresh-2");
  });

  it("does not ask for a secure cookie on a LAN origin, where Secure would silently drop the session", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...ROTATED_DATA }) }));

    await expect(bffRefresh({ token: "refresh-1", origin: LAN_ORIGIN })).resolves.toMatchObject({
      cookie: { secure: false },
    });
  });
});

describe("bffRevoke — logout is local first, upstream second", () => {
  it("answers a browser that is already logged out with a success, not an error it cannot explain", async () => {
    const result = await bffRevoke({ token: null, origin: HTTPS_ORIGIN });

    expect(result.status).toBe(200);
    expect(envelopeOf(result)).toMatchObject({ statusCode: 200, isSuccess: true, data: null, errors: null });
    expect(result.cookie).toMatchObject({ value: "", maxAge: 0 });
    expect(forward).not.toHaveBeenCalled();
  });

  it("spends the token upstream with the documented reason, then drops the cookie whatever the tenant said", async () => {
    forward.mockResolvedValue(upstream({ body: envelope(null) }));

    const result = await bffRevoke({ token: "refresh-1", origin: HTTPS_ORIGIN });

    expect(forward.mock.calls[0]).toEqual([
      REVOKE_PATH,
      { body: { refreshToken: "refresh-1", reason: "User logged out" } },
    ]);
    expect(result.status).toBe(200);
    expect(result.cookie).toMatchObject({ value: "", maxAge: 0, httpOnly: true, path: "/api/auth" });
  });

  it("clears the cookie even when the tenant refused, so no browser is left believing it is signed in", async () => {
    const refused = envelope(null, {
      statusCode: 409,
      isSuccess: false,
      errors: { "RefreshToken.AlreadyRevoked": "This refresh token was already revoked." },
    });
    forward.mockResolvedValue(upstream({ status: 409, body: refused }));

    const result = await bffRevoke({ token: "refresh-1", origin: HTTPS_ORIGIN });

    expect(result.status).toBe(409);
    expect(result.body).toBe(refused);
    expect(result.cookie).toMatchObject({ value: "", maxAge: 0 });
  });

  it("keeps a 429's Retry-After on the way out, because a stuck logout is still a stuck logout", async () => {
    const throttled = envelope(null, { statusCode: 429, isSuccess: false, errors: { "RateLimit.Exceeded": "Busy." } });
    forward.mockResolvedValue(upstream({ status: 429, body: throttled, retryAfterSeconds: 45 }));

    const result = await bffRevoke({ token: "refresh-1", origin: HTTPS_ORIGIN });

    expect(result.retryAfterSeconds).toBe(45);
    expect(result.cookie).toMatchObject({ maxAge: 0 });
  });

  it("turns a bare 204 from the tenant into the void envelope the client expects", async () => {
    forward.mockResolvedValue(upstream({ status: 204 }));

    const result = await bffRevoke({ token: "refresh-1", origin: HTTPS_ORIGIN });

    expect(result.status).toBe(204);
    expect(envelopeOf(result)).toMatchObject({ statusCode: 204, isSuccess: true, data: null });
  });
});

describe("bffAttach — one-time adoption of a pre-cookie session", () => {
  it("hands the stored token to the jar once and answers with nothing that could echo it back", async () => {
    const result = await bffAttach({ body: { refreshToken: "refresh-legacy" }, origin: HTTPS_ORIGIN });

    expect(result).toMatchObject({ status: 204, body: null, retryAfterSeconds: null });
    expect(result.cookie).toMatchObject({ value: "refresh-legacy", maxAge: COOKIE_MAX_AGE });
    expect(forward).not.toHaveBeenCalled();
  });

  it("refuses an adoption request with no usable token instead of writing an empty session", async () => {
    for (const body of [null, undefined, "refresh-legacy", {}, { refreshToken: "" }, { refreshToken: "  " }]) {
      const result = await bffAttach({ body, origin: HTTPS_ORIGIN });
      expect(result).toMatchObject({ status: 400, cookie: null });
      expect(envelopeOf(result).errors).toEqual({ "Validation.Failed": expect.any(String) });
    }
  });

  it("refuses a token over the cookie ceiling, which no browser would store either", async () => {
    const result = await bffAttach({ body: { refreshToken: "a".repeat(8193) }, origin: HTTPS_ORIGIN });
    expect(result.status).toBe(400);
    expect(result.cookie).toBeNull();
  });
});

describe("bffResponse — the only place a rotated token is ever written", () => {
  it("sets the cookie, forbids caching, and says so in the headers a proxy can read", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...SESSION_DATA }) }));

    const response = bffResponse(await bffVerify({ body: { challengeId: "ch-1" }, origin: HTTPS_ORIGIN }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Set-Cookie")).toContain("nawy_refresh=refresh-1");
    expect(response.headers.get("Set-Cookie")).toContain("Path=/api/auth");
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Set-Cookie")).toContain("SameSite=Lax");
    expect(response.headers.get("Set-Cookie")).toContain("Secure");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=1209600");
    // The cookie is the only carrier: the serialised body the browser parses
    // must not contain the token anywhere.
    expect(await readBody(response)).not.toContain("refresh-1");
  });

  it("sends Retry-After only when the tenant actually gave a number", () => {
    const throttled: BffResult = {
      status: 429,
      body: envelope(null, { statusCode: 429, isSuccess: false, errors: { "Auth.OtpRateLimitExceeded": "Wait." } }),
      retryAfterSeconds: 180,
      cookie: null,
    };
    expect(bffResponse(throttled).headers.get("Retry-After")).toBe("180");

    const refused: BffResult = { ...throttled, retryAfterSeconds: null };
    expect(bffResponse(refused).headers.has("Retry-After")).toBe(false);
  });

  it("sends no body at all for a 204, where any bytes would be a protocol error", async () => {
    const attached = await bffAttach({ body: { refreshToken: "refresh-legacy" }, origin: HTTPS_ORIGIN });
    const response = bffResponse(attached);

    expect(response.status).toBe(204);
    expect(await readBody(response)).toBe("");
    expect(response.headers.get("Set-Cookie")).toContain("nawy_refresh=refresh-legacy");
  });

  it("keeps a null-body success empty instead of serialising the word null", async () => {
    const response = bffResponse({ status: 200, body: null, retryAfterSeconds: null, cookie: null });
    expect(await readBody(response)).toBe("");
    expect(response.headers.has("Set-Cookie")).toBe(false);
  });

  it("round-trips the envelope so the client's catalog still has its code", async () => {
    forward.mockResolvedValue(
      upstream({
        status: 409,
        body: envelope(null, { statusCode: 409, isSuccess: false, errors: { "Customer.OtpAlreadyUsed": "Used." } }),
      }),
    );

    const verified = await bffVerify({ body: { challengeId: "ch-1", code: "123456" }, origin: DEV_ORIGIN });
    const response = bffResponse(verified);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      statusCode: 409,
      isSuccess: false,
      errors: { "Customer.OtpAlreadyUsed": "Used." },
    });
  });

  it("writes the wipe in both variants, so the old token really leaves the jar", async () => {
    const response = bffResponse(await bffRevoke({ token: null, origin: LAN_ORIGIN }));
    const lines = (response.headers.get("Set-Cookie") ?? "").split(", ");

    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toContain("nawy_refresh=;");
      expect(line).toContain("Max-Age=0");
    }
    // A jar that holds the https form cannot be emptied by a plaintext answer,
    // or the other way round; both have to be sent or the logout is a lie.
    expect(lines.some((line) => line.includes("Secure"))).toBe(true);
    expect(lines.some((line) => !line.includes("Secure"))).toBe(true);
  });

  it("never doubles a stored token, which would put a plaintext twin in the jar", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...SESSION_DATA }) }));

    const response = bffResponse(await bffVerify({ body: { challengeId: "ch-1" }, origin: HTTPS_ORIGIN }));

    expect((response.headers.get("Set-Cookie") ?? "").split(", ")).toHaveLength(1);
  });
});

describe("bffRequest — the two facts a handler must not forget", () => {
  it("reads the proxy's protocol off the headers alongside the url it was asked to serve", () => {
    const request = new Request("http://127.0.0.1:3000/api/auth/refresh", {
      headers: { "x-forwarded-proto": "https", "x-forwarded-for": "203.0.113.9" },
    });

    expect(bffRequest(request)).toEqual({ origin: request.url, forwardedProto: "https" });
  });

  it("reports a missing forwarded header as null, not as an empty string that reads as http", () => {
    const request = new Request("https://shop.example/api/auth/revoke");

    expect(bffRequest(request)).toEqual({ origin: request.url, forwardedProto: null });
  });

  it("carries the decision through to the cookie, so a proxied deployment writes Secure", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...SESSION_DATA }) }));

    const proxied = await bffVerify({
      body: { challengeId: "ch-1" },
      origin: "http://127.0.0.1:3000/api/auth/otp/verify",
      forwardedProto: "https",
    });
    expect(proxied.cookie).toMatchObject({ secure: true });

    const direct = await bffVerify({
      body: { challengeId: "ch-1" },
      origin: "http://127.0.0.1:3000/api/auth/otp/verify",
      forwardedProto: "http",
    });
    expect(direct.cookie).toMatchObject({ secure: true });

    const lan = await bffVerify({
      body: { challengeId: "ch-1" },
      origin: "http://192.168.1.20:3000/api/auth/otp/verify",
      forwardedProto: "http",
    });
    expect(lan.cookie).toMatchObject({ secure: false });
  });

  it("applies the same rule to every call that writes or wipes the jar", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...ROTATED_DATA }) }));
    await expect(
      bffRefresh({ token: "refresh-1", origin: "http://192.168.1.20:3000/api/auth/refresh", forwardedProto: "https" }),
    ).resolves.toMatchObject({ cookie: { secure: true } });

    await expect(
      bffRevoke({ token: "refresh-1", origin: "http://192.168.1.20:3000/api/auth/revoke", forwardedProto: "https" }),
    ).resolves.toMatchObject({ cookie: { secure: true, maxAge: 0 } });

    await expect(
      bffAttach({ body: { refreshToken: "legacy" }, origin: "http://192.168.1.20:3000/api/auth/session", forwardedProto: "https" }),
    ).resolves.toMatchObject({ cookie: { secure: true } });
  });

  it("defaults to the url alone when a caller passes no forwarded protocol at all", async () => {
    forward.mockResolvedValue(upstream({ body: envelope({ ...SESSION_DATA }) }));

    await expect(
      bffVerify({ body: { challengeId: "ch-1" }, origin: "https://shop.example/api/auth/otp/verify" }),
    ).resolves.toMatchObject({ cookie: { secure: true } });
  });
});

describe("bffCompleteProfile ? finish the account, hide the rotated token", () => {
  const PROFILE_PATH = "/api/v1/account/profile";
  const PROFILE_DATA = {
    profile: {
      customerId: "cus-1",
      phoneNumber: "+201012345678",
      firstName: "Nawy",
      lastName: "Guest",
      fullName: "Nawy Guest",
      email: null,
      isPhoneVerified: true,
      isEmailVerified: false,
      profileCompleted: true,
      nextStep: "Home",
    },
    session: { ...ROTATED_DATA },
  };

  it("forwards the name fields with the access token as a bearer credential", async () => {
    forward.mockResolvedValue(upstream({ body: envelope(PROFILE_DATA) }));

    const result = await bffCompleteProfile({
      token: "access-1",
      body: { accessToken: "access-1", firstName: "Nawy", lastName: "Guest" },
      origin: HTTPS_ORIGIN,
    });

    expect(forward).toHaveBeenCalledWith(PROFILE_PATH, {
      body: { firstName: "Nawy", lastName: "Guest" },
      token: "access-1",
    });
    expect(result.cookie).toMatchObject({ name: "nawy_refresh", value: "refresh-2" });
    expect(dataOf(result).session).not.toHaveProperty("refreshToken");
    expect((dataOf(result).session as Record<string, unknown>).accessToken).toBe("access-2");
  });

  it("refuses a call with no access token before it reaches the tenant", async () => {
    const result = await bffCompleteProfile({
      token: null,
      body: { firstName: "Nawy", lastName: "Guest" },
      origin: HTTPS_ORIGIN,
    });

    expect(result.status).toBe(401);
    expect(forward).not.toHaveBeenCalled();
    expect(result.cookie).toBeNull();
  });

  it("rejects a body that is not a JSON object", async () => {
    const result = await bffCompleteProfile({ token: "access-1", body: null, origin: HTTPS_ORIGIN });

    expect(result.status).toBe(400);
    expect(forward).not.toHaveBeenCalled();
  });

  it("relays a refused completion untouched and leaves the cookie alone", async () => {
    forward.mockResolvedValue(
      upstream({
        status: 422,
        body: envelope(null, { statusCode: 422, isSuccess: false, errors: { "Validation.Failed": "Invalid." } }),
      }),
    );

    const result = await bffCompleteProfile({
      token: "access-1",
      body: { firstName: "", lastName: "" },
      origin: HTTPS_ORIGIN,
    });

    expect(result.status).toBe(422);
    expect(result.cookie).toBeNull();
    expect(envelopeOf(result).errors).toEqual({ "Validation.Failed": "Invalid." });
  });

  it("answers 502 when a success carries no refresh token to store", async () => {
    forward.mockResolvedValue(
      upstream({ body: envelope({ ...PROFILE_DATA, session: { ...ROTATED_DATA, refreshToken: undefined } }) }),
    );

    const result = await bffCompleteProfile({
      token: "access-1",
      body: { firstName: "Nawy", lastName: "Guest" },
      origin: HTTPS_ORIGIN,
    });

    expect(result.status).toBe(502);
    expect(result.cookie).toBeNull();
  });
});
