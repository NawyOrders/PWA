import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  AppError,
  AUTH_ERROR_MESSAGES,
  AUTH_FIELD_MESSAGES,
  AUTH_FIELD_TARGETS,
  DEFAULT_TENANT_API_BASE_URL,
  REQUEST_TIMEOUT_MS,
  TENANT_API_BASE_URL_ENV,
  TENANT_API_BASE_URL_SERVER_ENV,
  apiBaseUrl,
  apiConfigured,
  apiUrl,
  apiErrorFieldTarget,
  apiErrorMessageKey,
  attachStoredRefresh,
  authMockRequested,
  authTransport,
  completeProfile,
  fetchBranding,
  forwardToTenant,
  isFatalRefreshError,
  isTenantResolutionError,
  isUsablePhone,
  normalizeEgyptianPhone,
  parseRetryAfter,
  refreshSession,
  requestOtp,
  retryBackoffSeconds,
  revokeSession,
  splitFullName,
  verifyOtp,
  type AppErrorKind,
  type AuthErrorCode,
} from "@/lib/api";
import { translate } from "@/lib/i18n";

/** A host that is obviously not the real one, so a leaked default is loud. */
const BASE = "https://tenant.test";
const PHONE = "+201012345678";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

type EnvelopeOptions = { statusCode?: number; isSuccess?: boolean; errors?: unknown };

/** Every documented response rides in the same envelope. */
function envelopeObj(data: unknown, options: EnvelopeOptions = {}): Record<string, unknown> {
  return {
    statusCode: options.statusCode ?? 200,
    isSuccess: options.isSuccess ?? true,
    data,
    errors: options.errors ?? null,
    timestamp: "2026-11-05T10:00:00Z",
  };
}

function envelope(data: unknown, options: EnvelopeOptions = {}): string {
  return JSON.stringify(envelopeObj(data, options));
}

function jsonResponse(body: string | null, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(body ?? "", {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

/** `application/problem+json` — the shape the tenant middleware answers with. */
function problemResponse(problem: Record<string, unknown>, status: number) {
  return jsonResponse(JSON.stringify(problem), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

/** A bare non-JSON answer, which is what the deployed API still returns on a 500. */
function textResponse(body: string, status: number, contentType = "text/html") {
  return new Response(body, { status, headers: { "Content-Type": contentType } });
}

function stubFetch(handler: (input: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

type FetchStub = ReturnType<typeof stubFetch>;

function jsonOf(init?: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

function sentHeaders(init?: RequestInit): Record<string, string> {
  return (init?.headers ?? {}) as unknown as Record<string, string>;
}

/** The URLs of the calls that tried to name the tenant in a header. */
function tenantHeaderViolations(fetchMock: FetchStub): string[] {
  return fetchMock.mock.calls
    .filter(([, init]) => Object.keys(sentHeaders(init)).some((key) => key.toLowerCase().includes("tenant")))
    .map(([url]) => url);
}

/** The URLs of the calls whose body carried a tenant-naming field. */
function tenantBodyViolations(fetchMock: FetchStub): string[] {
  return fetchMock.mock.calls
    .filter(([, init]) => {
      if (init?.body === undefined) return false;
      try {
        return Object.keys(jsonOf(init)).some((key) => key.toLowerCase().includes("tenant"));
      } catch {
        return false;
      }
    })
    .map(([url]) => url);
}

function urlsCalled(fetchMock: FetchStub): string[] {
  return fetchMock.mock.calls.map(([url]) => url);
}

/** The `AppError` a failing call produced, so the assertions can read its fields. */
async function failureFor(promise: Promise<unknown>): Promise<AppError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  if (error === null) throw new Error("expected the call to fail");
  if (!(error instanceof AppError)) throw error;
  return error;
}

const challenge = {
  challengeId: "ch-1",
  expiresAtUtc: "2026-11-05T10:05:00Z",
  expiresInSeconds: 300,
  devOtpCode: null,
};

/** What the BFF hands back after it moved the refresh token into the cookie. */
const sessionData = {
  customerId: "c-1",
  phoneNumber: PHONE,
  fullName: "Nawy Guest",
  email: null,
  accessToken: "access-1",
  tokenType: "Bearer",
  expiresIn: 900,
  expiresAtUtc: "2026-11-05T10:15:00Z",
};

const refreshedData = {
  accessToken: "access-2",
  tokenType: "Bearer",
  expiresIn: 900,
  expiresAtUtc: "2026-11-05T11:00:00Z",
  refreshTokenExpiresAtUtc: "2026-11-19T11:00:00Z",
};

const brandingData = { tenantId: "t-1", nameAr: "ناوي", primaryColor: "#E8452C" };

/** Serves every endpoint successfully, so one stub can answer a whole flow. */
function responseFor(url: string): Response {
  if (url.endsWith("/api/auth/otp/request")) return jsonResponse(envelope(challenge));
  if (url.endsWith("/api/v1/auth/otp/request")) return jsonResponse(envelope(challenge));
  if (url.endsWith("/api/auth/otp/verify")) return jsonResponse(envelope(sessionData));
  if (url.endsWith("/api/auth/refresh")) return jsonResponse(envelope(refreshedData));
  if (url.endsWith("/api/auth/revoke")) return jsonResponse(envelope(null));
  if (url.endsWith("/api/auth/session")) return new Response(null, { status: 204 });
  if (url.endsWith("/api/v1/Branding")) return jsonResponse(envelope(brandingData));
  throw new Error(`unexpected endpoint: ${url}`);
}

/* -------------------------------------------------------------------------- */

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // Vitest runs with NODE_ENV=test, so a mock flag left set anywhere in this
  // worker would silently route requestOtp/verifyOtp into the in-process
  // simulator instead of the stubbed fetch — and the fetch assertions below
  // would then be asserting nothing. Clear all three, every time.
  vi.stubEnv("AUTH_MOCK", "");
  vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "");
  vi.stubEnv(TENANT_API_BASE_URL_ENV, "");
  vi.stubEnv(TENANT_API_BASE_URL_SERVER_ENV, "");
  vi.stubEnv("TENANT_ROOT_DOMAIN", "");
  vi.stubEnv("TENANT_API_BASE_URL_TEMPLATE", "");
});

describe("API configuration", () => {
  it("answers with no tenant host when the deploy pointed at nothing", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, "");
    expect(apiBaseUrl()).toBe("");
    expect(apiConfigured()).toBe(false);
  });

  it("answers with no tenant host when the variable is absent entirely", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, undefined);
    expect(apiBaseUrl()).toBe("");
    expect(apiConfigured()).toBe(false);
  });

  it("trims whitespace and trailing slashes so the join stays clean", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, "  https://tenant.test///  ");
    expect(apiBaseUrl()).toBe("https://tenant.test");
    expect(apiConfigured()).toBe(true);
  });

  it("is configured only when the deploy really named a backend", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, "   ");
    expect(apiConfigured()).toBe(false);
    vi.stubEnv(TENANT_API_BASE_URL_ENV, "https://burger-house.nawyorders.com");
    expect(apiConfigured()).toBe(true);
    expect(apiBaseUrl()).toBe("https://burger-house.nawyorders.com");
  });

  it("never produces //api, whichever way the path is written", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, "https://tenant.test/");
    expect(apiUrl("/api/v1/Branding")).toBe(`${BASE}/api/v1/Branding`);
    expect(apiUrl("api/v1/Branding")).toBe(`${BASE}/api/v1/Branding`);
    expect(apiUrl("api/v1/Branding")).toBe(apiUrl("/api/v1/Branding"));
  });

  it("keeps a request that reaches the tenant host on the configured host", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, `${BASE}///`);
    const fetchMock = stubFetch((url) => responseFor(url));
    await fetchBranding();
    expect(urlsCalled(fetchMock)).toEqual([`${BASE}/api/v1/Branding`]);
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("has no hardcoded tenant fallback, because one image serves every store", () => {
    // The old default named the Tahrir tenant. On a multi-tenant storefront that
    // would quietly point every unknown host at one restaurant, so the only safe
    // default is "not configured".
    expect(DEFAULT_TENANT_API_BASE_URL).toBe("");
  });

  it("treats the multi-tenant server settings as a configured backend", () => {
    vi.stubEnv("TENANT_ROOT_DOMAIN", "nawyorders.com");
    vi.stubEnv("TENANT_API_BASE_URL_TEMPLATE", "https://{slug}.api.nawyorders.com");
    expect(apiConfigured()).toBe(true);
    expect(authTransport()).toBe("live");
  });

  it("reads the guide's own variable name when the public one was never declared", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, undefined);
    vi.stubEnv(TENANT_API_BASE_URL_SERVER_ENV, "https://slug.api.nawyorders.com");
    expect(apiConfigured()).toBe(true);
    expect(apiBaseUrl()).toBe("https://slug.api.nawyorders.com");
    expect(apiUrl("/api/v1/auth/otp/request")).toBe("https://slug.api.nawyorders.com/api/v1/auth/otp/request");
    expect(authTransport()).toBe("live");
  });

  it("trims the guide's name exactly like the public one", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, "");
    vi.stubEnv(TENANT_API_BASE_URL_SERVER_ENV, "  https://slug.api.nawyorders.com///  ");
    expect(apiBaseUrl()).toBe("https://slug.api.nawyorders.com");
    expect(apiConfigured()).toBe(true);
  });

  it("lets the public name win, so the browser and the BFF cannot land on two tenants", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, "https://browser.api.nawyorders.com");
    vi.stubEnv(TENANT_API_BASE_URL_SERVER_ENV, "https://server.api.nawyorders.com");
    expect(apiBaseUrl()).toBe("https://browser.api.nawyorders.com");
  });

  it("stays in demo mode when both names are blank", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, "   ");
    vi.stubEnv(TENANT_API_BASE_URL_SERVER_ENV, "");
    expect(apiConfigured()).toBe(false);
    expect(authTransport()).toBe("demo");
  });
});

describe("authTransport", () => {
  it("goes live the moment a backend is configured", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    expect(authTransport()).toBe("live");
  });

  it("keeps the offline demo login when nothing is configured", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, "");
    expect(authTransport()).toBe("demo");
  });

  it("selects the simulator only when a flag asked for it", () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    expect(authMockRequested()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "true");
    expect(authMockRequested()).toBe(true);
    expect(authTransport()).toBe("mock");
  });

  it("asks for nothing at all when neither flag was ever declared", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", undefined);
    vi.stubEnv("AUTH_MOCK", undefined);
    expect(authMockRequested()).toBe(false);
  });

  it("reads the flag the way a human types it", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "  TRUE  ");
    expect(authMockRequested()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "1");
    expect(authMockRequested()).toBe(false);
  });

  it("accepts the server-side twin when the browser one was never declared", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", undefined);
    vi.stubEnv("AUTH_MOCK", "true");
    expect(authMockRequested()).toBe(true);
  });

  it("prefers the NEXT_PUBLIC twin even when it is empty, because that is the one in the bundle", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "");
    vi.stubEnv("AUTH_MOCK", "true");
    expect(authMockRequested()).toBe(false);
  });

  it("cannot be turned on from a production build", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "true");
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    expect(authMockRequested()).toBe(true);
    expect(authTransport()).toBe("live");
  });
});

describe("normalizeEgyptianPhone", () => {
  it("accepts the shapes a customer actually types", () => {
    expect(normalizeEgyptianPhone("01012345678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("010 123 456 78")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("+201012345678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("+20 1012345678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("00201012345678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("1012345678")).toBe("+201012345678");
    // Typed with the country code but without the plus: it already is E.164.
    expect(normalizeEgyptianPhone("201012345678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("20 101 234 5678")).toBe("+201012345678");
  });

  it("returns an empty string instead of a bogus +20", () => {
    expect(normalizeEgyptianPhone("")).toBe("");
    expect(normalizeEgyptianPhone("--")).toBe("");
  });

  it("keeps the country code of a number already typed in international form", () => {
    expect(normalizeEgyptianPhone("+966500000000")).toBe("+966500000000");
    expect(normalizeEgyptianPhone("+20 101 234 5678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone(" +1 305 555 0123 ")).toBe("+13055550123");
  });
});

describe("isUsablePhone", () => {
  it("spends an SMS only on a number the backend would accept", () => {
    // The contract takes 8–15 digits after the "+".
    expect(isUsablePhone(normalizeEgyptianPhone("01012345678"))).toBe(true);
    expect(isUsablePhone(normalizeEgyptianPhone("+201012345678"))).toBe(true);
    expect(isUsablePhone("+12345678")).toBe(true);
    expect(isUsablePhone("+123456789012345")).toBe(true);
  });

  it("refuses the lengths the API answers 422 for", () => {
    expect(isUsablePhone("+1234567")).toBe(false);
    expect(isUsablePhone("+1234567890123456")).toBe(false);
    expect(isUsablePhone("")).toBe(false);
    expect(isUsablePhone(normalizeEgyptianPhone("abc"))).toBe(false);
  });
});

describe("parseRetryAfter", () => {
  it("reads the delay-seconds form the per-phone limiter sends", () => {
    expect(parseRetryAfter("180")).toBe(180);
    expect(parseRetryAfter(" 7 ")).toBe(7);
    expect(parseRetryAfter("0")).toBe(0);
  });

  it("converts the HTTP-date form into seconds from now", () => {
    const now = Date.parse("2026-11-05T10:00:00Z");
    expect(parseRetryAfter("Thu, 05 Nov 2026 10:00:45 GMT", now)).toBe(45);
    // A date already in the past means "stop waiting", not a negative timer.
    expect(parseRetryAfter("Thu, 05 Nov 2026 09:59:00 GMT", now)).toBe(0);
  });

  it("stays null when the server said nothing usable", () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("")).toBeNull();
    expect(parseRetryAfter("soon")).toBeNull();
    expect(parseRetryAfter("-5")).toBeNull();
    expect(parseRetryAfter("5.5")).toBeNull();
    expect(parseRetryAfter("not a date at all")).toBeNull();
    // A delay too large for a countdown is not a delay either.
    expect(parseRetryAfter("99999999999999999999")).toBeNull();
  });
});

describe("AppError", () => {
  it("is still the class the screens catch", () => {
    expect(ApiError).toBe(AppError);
    expect(new ApiError({ kind: "server", status: 500 })).toBeInstanceOf(AppError);
    expect(new ApiError({ kind: "server", status: 500 })).toBeInstanceOf(Error);
  });

  it("names itself by the code that failed and defaults everything else", () => {
    const error = new AppError({ kind: "conflict", status: 409, code: "Customer.OtpAlreadyUsed" });
    expect(error.name).toBe("AppError");
    expect(error.message).toBe("Customer.OtpAlreadyUsed");
    expect(error).toMatchObject({
      kind: "conflict",
      status: 409,
      code: "Customer.OtpAlreadyUsed",
      fieldErrors: {},
      retryAfterSeconds: null,
      problemDetail: null,
    });
    // A failure with no domain code is still named by what happened to it.
    expect(new AppError({ kind: "offline", status: 0 }).message).toBe("offline");
  });
});

describe("requestOtp", () => {
  it("posts the documented login challenge body through the app's BFF, never to the tenant host", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(challenge)));

    await expect(requestOtp({ phoneNumber: PHONE })).resolves.toEqual(challenge);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/otp/request");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(sentHeaders(fetchMock.mock.calls[0]?.[1])).toMatchObject({ Accept: "application/json" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({ phoneNumber: PHONE, channel: "Sms" });
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("sends the contract's own casing for the channel and never the purpose", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(challenge)));

    await requestOtp({ phoneNumber: PHONE, channel: "whatsapp", purpose: "Registration" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({
      phoneNumber: PHONE,
      channel: "WhatsApp",
    });
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("keeps the lifetime the server sent and repairs the ones it did not", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);

    stubFetch(() => jsonResponse(envelope({ ...challenge, expiresInSeconds: 120.9 })));
    await expect(requestOtp({ phoneNumber: PHONE })).resolves.toMatchObject({ expiresInSeconds: 120 });

    // A negative or fractional lifetime would break every countdown built on it.
    stubFetch(() => jsonResponse(envelope({ ...challenge, expiresInSeconds: -30.7 })));
    await expect(requestOtp({ phoneNumber: PHONE })).resolves.toMatchObject({ expiresInSeconds: 0 });

    stubFetch(() => jsonResponse(envelope({ ...challenge, expiresInSeconds: null, expiresAtUtc: null })));
    await expect(requestOtp({ phoneNumber: PHONE })).resolves.toEqual({
      challengeId: "ch-1",
      expiresAtUtc: "",
      expiresInSeconds: 0,
      devOtpCode: null,
    });
  });

  it("passes a development code through and turns an unusable one into null", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);

    // A Development tenant exposes the code; the screen has to be able to show it.
    stubFetch(() => jsonResponse(envelope({ ...challenge, devOtpCode: "246810" })));
    await expect(requestOtp({ phoneNumber: PHONE })).resolves.toMatchObject({ devOtpCode: "246810" });

    stubFetch(() => jsonResponse(envelope({ ...challenge, devOtpCode: 246810 })));
    await expect(requestOtp({ phoneNumber: PHONE })).resolves.toMatchObject({ devOtpCode: null });
  });

  it("refuses a challenge without an id, because nothing can be verified with it", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope({ expiresInSeconds: 300 })));

    await expect(requestOtp({ phoneNumber: PHONE })).rejects.toMatchObject({ kind: "envelope", status: 200 });
  });

  it("gives the per-phone limit the 180 seconds the header promised", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() =>
      jsonResponse(envelope(null, { statusCode: 429, isSuccess: false, errors: { "Auth.OtpRateLimitExceeded": "Too many OTP requests for this phone number." } }), {
        status: 429,
        headers: { "Retry-After": "180" },
      }),
    );

    const error = await failureFor(requestOtp({ phoneNumber: PHONE }));
    expect(error).toMatchObject({
      kind: "rateLimited",
      status: 429,
      code: "Auth.OtpRateLimitExceeded",
      retryAfterSeconds: 180,
    });
    expect(apiErrorMessageKey(error)).toBe(AUTH_ERROR_MESSAGES["Auth.OtpRateLimitExceeded"]);
    expect(retryBackoffSeconds(error)).toBe(180);
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("gives the global throttle a default wait, because it never says how long", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(
        envelope(null, { statusCode: 429, isSuccess: false, errors: { "RateLimit.Exceeded": "API rate limit exceeded." } }),
        { status: 429 },
      ),
    );

    const error = await failureFor(requestOtp({ phoneNumber: PHONE }));
    expect(error).toMatchObject({ kind: "rateLimited", code: "RateLimit.Exceeded", retryAfterSeconds: null });
    expect(retryBackoffSeconds(error)).toBe(30);
    expect(apiErrorMessageKey(error)).toBe(AUTH_ERROR_MESSAGES["RateLimit.Exceeded"]);
  });
});

describe("verifyOtp", () => {
  it("goes through the app's own BFF route with cookies, not to the tenant host", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(sessionData)));

    await expect(verifyOtp({ challengeId: "ch-1", code: " 123456 " })).resolves.toEqual(sessionData);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/otp/verify");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({ challengeId: "ch-1", code: "123456" });
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("keeps the refresh token out of JavaScript even if a relay forgot to strip it", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope({ ...sessionData, refreshToken: "refresh-1" })));

    const session = await verifyOtp({ challengeId: "ch-1", code: "123456" });
    expect(session).not.toHaveProperty("refreshToken");
    expect(session).toEqual(sessionData);
  });

  it("keeps the identity the answer actually carried", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(
        envelope({
          customerId: "c-2",
          phoneNumber: PHONE,
          fullName: "Ahmed Mohamed",
          email: "ahmed@example.com",
          accessToken: "access-1",
          tokenType: "Bearer",
          expiresIn: 900,
          expiresAtUtc: "2026-11-05T10:15:00Z",
        }),
      ),
    );

    await expect(verifyOtp({ challengeId: "ch-1", code: "123456" })).resolves.toEqual({
      customerId: "c-2",
      phoneNumber: PHONE,
      fullName: "Ahmed Mohamed",
      email: "ahmed@example.com",
      accessToken: "access-1",
      tokenType: "Bearer",
      expiresIn: 900,
      expiresAtUtc: "2026-11-05T10:15:00Z",
    });
  });

  it("keeps the typed name out of the live verify body, because the contract names the account through /account/profile", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(sessionData)));

    await verifyOtp({ challengeId: "ch-1", code: " 123456 ", fullName: "  Nawy Guest  " });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({ challengeId: "ch-1", code: "123456" });

    // A blank or oversized name must not leak into a request the contract has
    // no field for.
    await verifyOtp({ challengeId: "ch-1", code: "123456", fullName: "م".repeat(250) });
    expect(jsonOf(fetchMock.mock.calls[1]?.[1])).toEqual({ challengeId: "ch-1", code: "123456" });
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("fills in the identity fields the answer left out instead of storing undefined", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope({ accessToken: "access-1", expiresIn: 900 })));

    await expect(verifyOtp({ challengeId: "ch-1", code: "123456" })).resolves.toEqual({
      customerId: "",
      phoneNumber: "",
      fullName: "",
      email: null,
      accessToken: "access-1",
      tokenType: "Bearer",
      expiresIn: 900,
      expiresAtUtc: "",
    });
  });

  /**
   * A session answer carrying a name in whichever shape the build sends.
   * `fullName` is removed rather than blanked when the caller did not name it,
   * because that is what the deployed swagger's answer actually looks like.
   */
  function namedSession(name: Record<string, unknown>): Record<string, unknown> {
    const answer: Record<string, unknown> = { ...sessionData, ...name };
    if (!("fullName" in name)) delete answer.fullName;
    return answer;
  }

  it("reads the name the deployed build sends instead of signing everybody in nameless", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    // The deployed `/otp/verify` answers `firstName`/`lastName`; the guide
    // documents `fullName`. Reading only the guide's field would greet every
    // customer with an empty name.
    stubFetch(() => jsonResponse(envelope(namedSession({ firstName: "Ahmed", lastName: "Mohamed" }))));

    const session = await verifyOtp({ challengeId: "ch-1", code: "123456" });
    expect(session.fullName).toBe("Ahmed Mohamed");
    expect(session).toMatchObject({ customerId: "c-1", accessToken: "access-1", expiresIn: 900 });
    expect(session).not.toHaveProperty("firstName");
    expect(session).not.toHaveProperty("lastName");
  });

  it("lets the guide's fullName win, so a corrected contract needs no client change", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(envelope(namedSession({ fullName: "  Ahmed Mohamed Ali  ", firstName: "Ahmed", lastName: "Mohamed" }))),
    );

    await expect(verifyOtp({ challengeId: "ch-1", code: "123456" })).resolves.toMatchObject({
      fullName: "Ahmed Mohamed Ali",
    });
  });

  it("falls back to the pair when fullName arrived blank, not only when it is missing", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope(namedSession({ fullName: "   ", firstName: " Ahmed ", lastName: "Mohamed " }))));

    await expect(verifyOtp({ challengeId: "ch-1", code: "123456" })).resolves.toMatchObject({
      fullName: "Ahmed Mohamed",
    });
  });

  it("joins only the parts that are really names", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const answers = [
      namedSession({ firstName: "  Ahmed  ", lastName: null }),
      namedSession({ firstName: 42, lastName: { value: "Mohamed" } }),
      namedSession({ lastName: "Mohamed" }),
      namedSession({ firstName: "   ", lastName: "" }),
      namedSession({ firstName: null, lastName: null }),
    ];
    let index = 0;
    stubFetch(() => jsonResponse(envelope(answers[index++])));

    expect((await verifyOtp({ challengeId: "ch-1", code: "123456" })).fullName).toBe("Ahmed");
    expect((await verifyOtp({ challengeId: "ch-1", code: "123456" })).fullName).toBe("");
    expect((await verifyOtp({ challengeId: "ch-1", code: "123456" })).fullName).toBe("Mohamed");
    expect((await verifyOtp({ challengeId: "ch-1", code: "123456" })).fullName).toBe("");
    expect((await verifyOtp({ challengeId: "ch-1", code: "123456" })).fullName).toBe("");
  });

  it("caps a joined name at the same 200 characters the rest of the app stores", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope(namedSession({ firstName: "م".repeat(150), lastName: "ع".repeat(150) }))));

    const session = await verifyOtp({ challengeId: "ch-1", code: "123456" });
    expect(session.fullName).toHaveLength(200);
    expect(session.fullName).toBe(`${"م".repeat(150)} ${"ع".repeat(49)}`);
  });

  it("refuses a session it cannot put an expiry on", async () => {
    // A success with no usable `expiresIn` or `expiresAtUtc` reads as stale the
    // immediately, and again after that — against the tenant-wide limiter every
    // customer shares. One honest failure beats that loop.
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope({ accessToken: "access-1", expiresIn: "nope" })));

    await expect(verifyOtp({ challengeId: "ch-1", code: "123456" })).rejects.toMatchObject({
      kind: "envelope",
      status: 200,
    });
  });

  it("refuses a session answer with no access token, because nothing can be called with it", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope({ customerId: "c-1" })));

    await expect(verifyOtp({ challengeId: "ch-1", code: "123456" })).rejects.toMatchObject({ kind: "envelope" });
  });

  it("keeps the PascalCase validation keys the contract uses", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(
        envelope(null, {
          statusCode: 400,
          isSuccess: false,
          errors: { PhoneNumber: "phoneNumber: The field PhoneNumber must not be empty." },
        }),
        { status: 400 },
      ),
    );

    const error = await failureFor(verifyOtp({ challengeId: "ch-1", code: "123456" }));
    expect(error).toMatchObject({
      kind: "validation",
      status: 400,
      code: "Validation.Failed",
      fieldErrors: { PhoneNumber: "phoneNumber: The field PhoneNumber must not be empty." },
      retryAfterSeconds: null,
    });
    expect(apiErrorFieldTarget(error)).toBe("phone");
    // The customer gets the field's own sentence, not the generic one: a body
    // that only names `PhoneNumber` says more than `Validation.Failed` does.
    expect(apiErrorMessageKey(error)).toBe(AUTH_FIELD_MESSAGES.PhoneNumber);
  });
});

describe("refreshSession, revokeSession and attachStoredRefresh", () => {
  it("rotates through the BFF and keeps the replacement token in the cookie jar", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope({ ...refreshedData, refreshToken: "refresh-2" })));

    const pair = await refreshSession();
    expect(pair).toEqual(refreshedData);
    expect(pair).not.toHaveProperty("refreshToken");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/refresh");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({});
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("defaults a thin refresh answer", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(
        envelope({
          accessToken: "a",
          expiresAtUtc: "2026-11-05T11:00:00Z",
          refreshTokenExpiresAtUtc: 12345,
        }),
      ),
    );

    await expect(refreshSession()).resolves.toEqual({
      accessToken: "a",
      tokenType: "Bearer",
      // No `expiresIn` of its own, so the timestamp is the whole answer — and a
      // refresh lifetime that is not a string is not one the app will believe.
      expiresIn: 0,
      expiresAtUtc: "2026-11-05T11:00:00Z",
      refreshTokenExpiresAtUtc: null,
    });
  });

  it("refuses a rotation that cannot say how long the new token lives", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope({ accessToken: "a", refreshTokenExpiresAtUtc: 12345 })));

    await expect(refreshSession()).rejects.toMatchObject({ kind: "envelope", status: 200 });
  });

  it("refuses a refresh answer with no access token", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope({ accessToken: "" })));

    await expect(refreshSession()).rejects.toMatchObject({ kind: "envelope" });
  });

  it("revokes with the reason the guide asks for and ignores the empty data payload", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(null)));

    await expect(revokeSession()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/revoke");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({ reason: "User logged out" });
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("accepts the bodiless 204 the BFF answers when there is nothing to say", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => new Response(null, { status: 204 }));

    await expect(revokeSession()).resolves.toBeUndefined();
  });

  it("treats an already-revoked token as logged out, which is what the customer asked for", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() =>
      jsonResponse(
        envelope(null, {
          statusCode: 409,
          isSuccess: false,
          errors: { "RefreshToken.AlreadyRevoked": "This refresh token was already revoked." },
        }),
        { status: 409 },
      ),
    );

    await expect(revokeSession()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("still reports a logout failure the customer has not already survived", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(envelope(null, { statusCode: 401, isSuccess: false, errors: { "RefreshToken.Invalid": "Unknown token." } })),
    );

    const error = await failureFor(revokeSession());
    expect(error).toMatchObject({ kind: "unauthorized", status: 401, code: "RefreshToken.Invalid" });
    expect(apiErrorMessageKey(error)).toBe(AUTH_ERROR_MESSAGES["RefreshToken.Invalid"]);
  });

  it("rethrows anything else, so a 500 during logout is not mistaken for a clean sign-out", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => textResponse("<html>boom</html>", 500));

    await expect(revokeSession()).rejects.toMatchObject({ kind: "server", status: 500 });
  });

  it("hands a token an older build left in storage to the app server once, same-origin", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    await expect(attachStoredRefresh("refresh-1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/session");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({ refreshToken: "refresh-1" });
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("adopts nothing in the simulator, whose whole point is that no request leaves the page", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "true");
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    // The simulator keeps its own in-memory jar and never reads a cookie, so
    // posting a legacy token would forward a live-shaped body to the real
    // tenant host from a mode that promises not to touch the network.
    await expect(attachStoredRefresh("legacy-refresh")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fetchBranding", () => {
  it("reads the payload and its ETag from the tenant host", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(brandingData), { headers: { ETag: '"b1"' } }));

    await expect(fetchBranding()).resolves.toEqual({ notModified: false, branding: brandingData, etag: '"b1"' });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/api/v1/Branding`);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "GET", credentials: "omit" });
    expect(sentHeaders(fetchMock.mock.calls[0]?.[1])).toMatchObject({ Accept: "application/json" });
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("sends If-None-Match and reports a 304 as unchanged", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => new Response(null, { status: 304, headers: { ETag: '"b1"' } }));

    await expect(fetchBranding({ etag: '"b1"' })).resolves.toEqual({ notModified: true, branding: null, etag: '"b1"' });
    expect(sentHeaders(fetchMock.mock.calls[0]?.[1])).toMatchObject({ "If-None-Match": '"b1"' });
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("says there is nothing to revalidate when the answer carried no ETag", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => new Response(null, { status: 304 }));

    await expect(fetchBranding({ etag: null })).resolves.toEqual({ notModified: true, branding: null, etag: null });
  });
});

describe("routing over the whole flow", () => {
  it("keeps every auth call on the app server and only branding on the tenant host", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    // The retired tenant env names must change nothing: the tenant comes from
    // the request host, so even a deploy that still sets them sends no header
    // and no body field naming the tenant anywhere.
    vi.stubEnv("NEXT_PUBLIC_TENANT_ID", "nawy");
    vi.stubEnv("TENANT_ID", "nawy");
    const fetchMock = stubFetch((url) => responseFor(url));

    await requestOtp({ phoneNumber: PHONE });
    await verifyOtp({ challengeId: "ch-1", code: "123456" });
    await refreshSession();
    await revokeSession();
    await attachStoredRefresh("refresh-1");
    await fetchBranding();

    expect(urlsCalled(fetchMock)).toEqual([
      "/api/auth/otp/request",
      "/api/auth/otp/verify",
      "/api/auth/refresh",
      "/api/auth/revoke",
      "/api/auth/session",
      `${BASE}/api/v1/Branding`,
    ]);
    // The tenant comes from the request host; a header that disagrees with it is
    // a documented 400, so none is ever sent — on any endpoint.
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
    expect(tenantBodyViolations(fetchMock)).toEqual([]);
    // None of these calls carries a bearer token, so none may send an
    // Authorization header: the BFF hops authenticate with the httpOnly cookie
    // and the anonymous ones need no credential at all.
    for (const [, init] of fetchMock.mock.calls) {
      expect(sentHeaders(init)).not.toHaveProperty("Authorization");
    }
  });
});

describe("failure mapping", () => {
  it("maps the transport status onto the kind the screens branch on", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const cases: [number, AppErrorKind][] = [
      [400, "validation"],
      [401, "unauthorized"],
      [404, "notFound"],
      [409, "conflict"],
      [422, "validation"],
      [429, "rateLimited"],
      [500, "server"],
      [503, "server"],
      [418, "validation"],
    ];

    for (const [status, kind] of cases) {
      stubFetch(() => textResponse("", status));
      await expect(fetchBranding()).rejects.toMatchObject({ kind, status });
    }
  });

  it("turns a bare non-JSON 500 into a usable error instead of a crash", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => textResponse("<html><body>System.InvalidCastException at NawyOrders.Program</body></html>", 500));

    const error = await failureFor(requestOtp({ phoneNumber: PHONE }));
    expect(error).toMatchObject({ kind: "server", status: 500, code: null, fieldErrors: {}, retryAfterSeconds: null });
    const message = apiErrorMessageKey(error);
    expect(message).toBe("حصل مشكلة في السيرفر، جرب تاني");
    // No exception type, no stack, no English server text reaches the customer.
    expect(message).not.toMatch(/[A-Za-z]/);
  });

  it("keeps the content type as console-only context when a JSON body arrives as plain text", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope(null, { statusCode: 400, isSuccess: false }), { status: 400, headers: { "Content-Type": "text/plain" } }));

    const error = await failureFor(fetchBranding());
    expect(error).toMatchObject({ kind: "validation", status: 400 });
    expect(error.problemDetail).toBe("text/plain");
  });

  it("reads a tenant ProblemDetails answer, which has no envelope at all", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      problemResponse(
        {
          status: 404,
          title: "Tenant Not Found",
          detail: "No tenant is configured for host missing.nawyorders.com.",
          instance: "/api/v1/auth/otp/request",
        },
        404,
      ),
    );

    const error = await failureFor(requestOtp({ phoneNumber: PHONE }));
    expect(error).toMatchObject({ kind: "notFound", status: 404, code: "Tenant.NotFound", fieldErrors: {} });
    expect(error.problemDetail).toBe("No tenant is configured for host missing.nawyorders.com.");
    expect(apiErrorMessageKey(error)).toBe(AUTH_ERROR_MESSAGES["Tenant.NotFound"]);
    expect(apiErrorFieldTarget(error)).toBeNull();
  });

  it("maps the 401 and 400 tenant failures the middleware documents", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);

    stubFetch(() => problemResponse({ status: 401, title: "Tenant Unresolved", detail: "Host could not be mapped." }, 401));
    expect(await failureFor(fetchBranding())).toMatchObject({ kind: "unauthorized", code: "Tenant.Unresolved" });

    stubFetch(() => problemResponse({ status: 400, title: "Tenant Configuration Conflicting" }, 400));
    expect(await failureFor(fetchBranding())).toMatchObject({ kind: "validation", code: "Tenant.Conflicting" });

    // Any 401 the tenant middleware cannot resolve the host for is the same
    // failure for the customer, whatever the title said.
    stubFetch(() => problemResponse({ status: 401, title: "Unauthorized" }, 401));
    expect(await failureFor(fetchBranding())).toMatchObject({ kind: "unauthorized", code: "Tenant.Unresolved" });
  });

  it("names a tenant problem by its status when the title is not the documented one", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);

    stubFetch(() => problemResponse({ status: 404, title: "Resource Missing", detail: "nothing here" }, 404));
    expect(await failureFor(fetchBranding())).toMatchObject({ code: "Tenant.NotFound", kind: "notFound" });

    // A conflict about the tenant configuration is still a conflict about it,
    // whatever status the middleware wrapped it in.
    stubFetch(() => problemResponse({ status: 409, title: "Tenant Configuration Ambiguous" }, 409));
    expect(await failureFor(fetchBranding())).toMatchObject({ code: "Tenant.Conflicting", kind: "conflict" });
  });

  it("recognises ProblemDetails from its shape when the content type only says json", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(JSON.stringify({ status: 404, title: "Not Found", detail: "no route" }), { status: 404 }));

    expect(await failureFor(fetchBranding())).toMatchObject({ code: "Tenant.NotFound", kind: "notFound" });

    // ASP.NET also sends `type` where the title would be; the shape still is a
    // problem, and an envelope it is not.
    stubFetch(() =>
      jsonResponse(JSON.stringify({ status: 404, type: "https://errors.nawyorders.com/tenant-unknown" }), { status: 404 }),
    );
    expect(await failureFor(fetchBranding())).toMatchObject({ code: "Tenant.NotFound", problemDetail: null });
  });

  it("treats a JSON body that is not an object as the unreadable answer it is", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(JSON.stringify("System.Exception: the stream is closed"), { status: 500 }));

    expect(await failureFor(fetchBranding())).toMatchObject({ kind: "server", status: 500, code: null });
  });

  it("names the tenant from the detail when the title says nothing", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => problemResponse({ status: 400, title: "Bad Request", detail: "The subdomain is not enabled." }, 400));

    const error = await failureFor(fetchBranding());
    expect(error.code).toBeNull();
    expect(apiErrorMessageKey(error)).toBe(AUTH_ERROR_MESSAGES["Tenant.Conflicting"]);
  });

  it("leaves a problem that is not about the tenant as the plain status it is", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => problemResponse({ status: 500, title: "Unexpected Failure", detail: "System.Data.SqlClient.SqlException" }, 500));

    const error = await failureFor(fetchBranding());
    expect(error).toMatchObject({ kind: "server", status: 500, code: null });
    expect(apiErrorMessageKey(error)).toBe("حصل مشكلة في السيرفر، جرب تاني");
    expect(apiErrorMessageKey(error)).not.toContain("SqlException");
  });

  it("trusts the envelope when the transport said 200", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(envelope(null, { statusCode: 429, isSuccess: false, errors: { "RateLimit.Exceeded": "Too many." } }), {
        headers: { "Retry-After": "45" },
      }),
    );

    expect(await failureFor(fetchBranding())).toMatchObject({
      kind: "rateLimited",
      status: 429,
      code: "RateLimit.Exceeded",
      retryAfterSeconds: 45,
    });
  });

  it("falls back to the transport status when the envelope forgot to say its own", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(JSON.stringify({ isSuccess: false, data: null, errors: null }), { status: 429 }));

    expect(await failureFor(fetchBranding())).toMatchObject({ kind: "rateLimited", status: 429, code: null });
  });

  it("reads field failures out of an envelope the transport never flagged", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(JSON.stringify({ isSuccess: false, data: null, errors: { Code: "Code: invalid." } })));

    const error = await failureFor(verifyOtp({ challengeId: "ch-1", code: "123456" }));
    expect(error).toMatchObject({ kind: "validation", status: 200, code: "Validation.Failed", fieldErrors: { Code: "Code: invalid." } });
    expect(apiErrorFieldTarget(error)).toBe("code");
  });

  it("takes the first domain code when an answer carries several", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(
        envelope(null, {
          statusCode: 422,
          isSuccess: false,
          errors: { "Customer.InvalidOtpCode": "Incorrect.", "Customer.OtpExpired": "Expired." },
        }),
        { status: 422 },
      ),
    );

    expect(await failureFor(verifyOtp({ challengeId: "ch-1", code: "123456" }))).toMatchObject({
      code: "Customer.InvalidOtpCode",
      kind: "validation",
    });
  });

  it("ignores an errors dictionary that is not a dictionary of strings", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(envelope(null, { statusCode: 422, isSuccess: false, errors: { PhoneNumber: 42, Code: null } }), {
        status: 422,
      }),
    );

    expect(await failureFor(verifyOtp({ challengeId: "ch-1", code: "123456" }))).toMatchObject({
      code: null,
      fieldErrors: {},
    });
  });

  it("treats a null data payload as a broken answer, not as a void", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope(null, { isSuccess: true })));

    expect(await failureFor(fetchBranding())).toMatchObject({ kind: "validation", status: 200, code: null });

    // The same when the field is simply not there.
    stubFetch(() => jsonResponse(JSON.stringify({ statusCode: 200, isSuccess: true, errors: null })));
    await expect(fetchBranding()).rejects.toMatchObject({ kind: "validation", status: 200 });
  });

  it("rejects an answer that is JSON but not an envelope", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(JSON.stringify("just a string")));

    await expect(fetchBranding()).rejects.toMatchObject({ kind: "envelope", status: 200 });
  });

  it("reports a network rejection as offline", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(fetchBranding()).rejects.toMatchObject({ kind: "offline", status: 0 });
  });

  it("reports an aborted request as a timeout", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
            });
          }),
      ),
    );

    const settled = fetchBranding().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(12_000);
    await expect(settled).resolves.toMatchObject({ kind: "timeout", status: 0 });
    vi.useRealTimers();
  });

  it("survives a rate limit that gave no header at all", () => {
    const quiet = new AppError({ kind: "rateLimited", status: 429, code: "RateLimit.Exceeded" });
    expect(retryBackoffSeconds(quiet)).toBe(30);
    expect(retryBackoffSeconds(quiet, 15)).toBe(15);
    // A zero default would mean an instant retry storm onto the same limiter.
    expect(retryBackoffSeconds(quiet, 0)).toBe(1);
    expect(retryBackoffSeconds(new AppError({ kind: "server", status: 500, retryAfterSeconds: 90 }))).toBeNull();
    expect(retryBackoffSeconds(new Error("not an API failure"))).toBeNull();
    expect(retryBackoffSeconds(null)).toBeNull();
  });
});

describe("authMock transport selection in the endpoints", () => {
  it("answers from the local simulator instead of the network when the flag asked for it", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "true");
    const fetchMock = stubFetch(() => jsonResponse(envelope(challenge)));

    await expect(requestOtp({ phoneNumber: PHONE })).resolves.toMatchObject({
      challengeId: expect.stringMatching(/^chal-mock-/),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets the simulator own the failures nobody can trigger against a live host", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "true");
    const fetchMock = stubFetch(() => jsonResponse(envelope(sessionData)));

    await expect(verifyOtp({ challengeId: "not-a-challenge", code: "123456" })).rejects.toMatchObject({
      kind: "notFound",
      code: "Customer.ChallengeNotFound",
    });
    await expect(refreshSession()).rejects.toMatchObject({ code: "RefreshToken.Invalid" });
    await expect(revokeSession()).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("isFatalRefreshError", () => {
  it("signs the customer out only when the token family is really gone", () => {
    // A 401 from `/refresh` is the guide's hard rule: expired, revoked or reuse
    // detected all mean the same thing — there is no session left to keep.
    expect(isFatalRefreshError(new AppError({ kind: "unauthorized", status: 401 }))).toBe(true);
    expect(isFatalRefreshError(new AppError({ kind: "unauthorized", status: 401, code: "RefreshToken.Expired" }))).toBe(true);
    expect(isFatalRefreshError(new AppError({ kind: "unauthorized", status: 401, code: "Tenant.Unresolved" }))).toBe(true);
    // A 409 that names a refresh token is the reuse-detection answer, which is
    // just as final as the 401.
    expect(isFatalRefreshError(new AppError({ kind: "conflict", status: 409, code: "RefreshToken.CompromisedReuse" }))).toBe(true);
    expect(isFatalRefreshError(new AppError({ kind: "conflict", status: 409, code: "RefreshToken.AlreadyRevoked" }))).toBe(true);
  });

  it("keeps a recoverable failure from logging anybody out", () => {
    // Everything below is a bad minute, not a dead session. Treating it as fatal
    // would sign the customer out on a lift ride and spend the tenant's shared
    // limiter re-authenticating them.
    expect(isFatalRefreshError(new AppError({ kind: "offline", status: 0 }))).toBe(false);
    expect(isFatalRefreshError(new AppError({ kind: "timeout", status: 0 }))).toBe(false);
    expect(isFatalRefreshError(new AppError({ kind: "server", status: 500 }))).toBe(false);
    expect(isFatalRefreshError(new AppError({ kind: "rateLimited", status: 429, retryAfterSeconds: 30 }))).toBe(false);
    expect(isFatalRefreshError(new AppError({ kind: "notFound", status: 404, code: "Tenant.NotFound" }))).toBe(false);
    // A 409 about something else — an OTP, a customer — says nothing about the
    // refresh token, so the prefix check is what keeps it out.
    expect(isFatalRefreshError(new AppError({ kind: "conflict", status: 409, code: "Customer.OtpAlreadyUsed" }))).toBe(false);
    expect(isFatalRefreshError(new AppError({ kind: "conflict", status: 409 }))).toBe(false);
    expect(isFatalRefreshError(new Error("socket hang up"))).toBe(false);
    expect(isFatalRefreshError(null)).toBe(false);
  });
});

describe("the cold-start tenant retry", () => {
  /** The middleware's answer for a host it has not mapped yet. */
  function tenantProblem(status: number, title: string) {
    return problemResponse({ status, title, detail: "No tenant is configured for this host." }, status);
  }

  it("asks once more when the first call after a restart could not resolve the tenant", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    let calls = 0;
    const fetchMock = stubFetch(() => {
      calls += 1;
      return calls === 1 ? tenantProblem(404, "Tenant Not Found") : jsonResponse(envelope(brandingData));
    });

    await expect(fetchBranding()).resolves.toMatchObject({ notModified: false, branding: brandingData });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlsCalled(fetchMock)).toEqual([
      `${BASE}/api/v1/Branding`,
      `${BASE}/api/v1/Branding`,
    ]);
    // The second ask is the same anonymous request: no tenant header, no
    // tenant field in the body, and nothing the first attempt changed.
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
    expect(tenantBodyViolations(fetchMock)).toEqual([]);
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe(fetchMock.mock.calls[0]?.[1]?.method);
    expect(sentHeaders(fetchMock.mock.calls[1]?.[1])).toEqual(sentHeaders(fetchMock.mock.calls[0]?.[1]));
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeUndefined();
  });

  it("gives an unresolved host the same single second chance", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    let calls = 0;
    const fetchMock = stubFetch(() => {
      calls += 1;
      return calls === 1 ? tenantProblem(401, "Tenant Unresolved") : jsonResponse(envelope(brandingData));
    });

    await expect(fetchBranding()).resolves.toMatchObject({ notModified: false, branding: brandingData });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops after one retry, because a host that is wrong stays wrong", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => tenantProblem(404, "Tenant Not Found"));

    const error = await failureFor(fetchBranding());
    expect(error).toMatchObject({ code: "Tenant.NotFound", status: 404, kind: "notFound" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(apiErrorMessageKey(error)).toBe(AUTH_ERROR_MESSAGES["Tenant.NotFound"]);
  });

  it("does not spend a second request on an answer about a customer", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() =>
      jsonResponse(
        envelope(null, {
          statusCode: 404,
          isSuccess: false,
          errors: { "Customer.NotFoundByPhone": "No customer exists for this phone number." },
        }),
        { status: 404 },
      ),
    );

    // A 404 about a phone is the registration offer, not a cold cache. Retrying
    // it would only ask the same question twice and still end at the same place.
    expect(await failureFor(fetchBranding())).toMatchObject({
      code: "Customer.NotFoundByPhone",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a rate limit, a broken backend or a dead connection", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const answers = [
      () =>
        jsonResponse(
          envelope(null, {
            statusCode: 429,
            isSuccess: false,
            errors: { "Auth.OtpRateLimitExceeded": "Too many OTP requests for this phone number." },
          }),
          { status: 429, headers: { "Retry-After": "180" } },
        ),
      () =>
        textResponse(
          "System.InvalidOperationException: Database credential 'Database:MasterUser' is not configured.",
          500,
          "text/plain",
        ),
      () => Promise.reject(new TypeError("Failed to fetch")),
    ];

    for (const answer of answers) {
      const fetchMock = stubFetch(answer);
      const error = await failureFor(fetchBranding());
      expect(error).toBeInstanceOf(AppError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      if (error.status === 429) expect(error.retryAfterSeconds).toBe(180);
    }
  });

  it("leaves the BFF's own retry to the BFF, so one cold start is not four requests", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => tenantProblem(404, "Tenant Not Found"));

    expect(await failureFor(verifyOtp({ challengeId: "ch-1", code: "123456" }))).toMatchObject({
      code: "Tenant.NotFound",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlsCalled(fetchMock)).toEqual(["/api/auth/otp/verify"]);
  });

  it("shares one timeout budget, so a retry cannot outlive the lock guarding a rotation", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    vi.useFakeTimers();
    const fetchMock = stubFetch(() => {
      // The first attempt ate the whole budget answering cold. There is no time
      // left for a second one, and the lock TTL is sized from that same budget.
      vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);
      return tenantProblem(404, "Tenant Not Found");
    });

    expect(await failureFor(fetchBranding())).toMatchObject({ code: "Tenant.NotFound" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("names only the two tenant-resolution failures as worth another ask", () => {
    expect(isTenantResolutionError(new AppError({ kind: "notFound", status: 404, code: "Tenant.NotFound" }))).toBe(true);
    expect(isTenantResolutionError(new AppError({ kind: "unauthorized", status: 401, code: "Tenant.Unresolved" }))).toBe(true);
    expect(isTenantResolutionError(new AppError({ kind: "validation", status: 400, code: "Tenant.Conflicting" }))).toBe(false);
    expect(isTenantResolutionError(new AppError({ kind: "notFound", status: 404, code: "Customer.NotFoundByPhone" }))).toBe(false);
    expect(isTenantResolutionError(new AppError({ kind: "notFound", status: 404 }))).toBe(false);
    expect(isTenantResolutionError(new AppError({ kind: "server", status: 500 }))).toBe(false);
    expect(isTenantResolutionError(new Error("offline"))).toBe(false);
    expect(isTenantResolutionError(null)).toBe(false);
  });
});

describe("forwardToTenant", () => {
  it("relays the status, body and Retry-After exactly as the tenant host sent them", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const failed = envelopeObj(null, {
      statusCode: 429,
      isSuccess: false,
      errors: { "Auth.OtpRateLimitExceeded": "Too many OTP requests for this phone number." },
    });
    const fetchMock = stubFetch(() => jsonResponse(JSON.stringify(failed), { status: 429, headers: { "Retry-After": "180" } }));

    const relayed = await forwardToTenant("/api/v1/auth/refresh", { body: { refreshToken: "r-1" }, token: "access-1" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/api/v1/auth/refresh`);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", credentials: "omit", cache: "no-store" });
    expect(sentHeaders(fetchMock.mock.calls[0]?.[1])).toMatchObject({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer access-1",
    });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({ refreshToken: "r-1" });
    expect(relayed).toEqual({ status: 429, contentType: "application/json", body: failed, retryAfterSeconds: 180 });
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
  });

  it("forwards a GET with no body and no bearer token", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const body = envelopeObj(brandingData);
    const fetchMock = stubFetch(() => jsonResponse(JSON.stringify(body)));

    const relayed = await forwardToTenant("/api/v1/Branding", { method: "GET" });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "GET" });
    expect(sentHeaders(fetchMock.mock.calls[0]?.[1])).not.toHaveProperty("Content-Type");
    expect(sentHeaders(fetchMock.mock.calls[0]?.[1])).not.toHaveProperty("Authorization");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(relayed).toEqual({ status: 200, contentType: "application/json", body, retryAfterSeconds: null });
  });

  it("keeps a bodiless answer as a null body instead of a parse crash", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => new Response(null, { status: 204 }));

    await expect(forwardToTenant("/api/v1/auth/revoke", { body: {} })).resolves.toEqual({
      status: 204,
      contentType: "application/json",
      body: null,
      retryAfterSeconds: null,
    });
  });

  it("reports an unparsable upstream body as null, whatever it was", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => textResponse("<html>developer exception page</html>", 500, "application/problem+json"));

    const relayed = await forwardToTenant("/api/v1/auth/otp/verify", { body: {} });
    expect(relayed).toEqual({
      status: 500,
      contentType: "application/problem+json",
      body: null,
      retryAfterSeconds: null,
    });
  });

  it("gives a cold tenant cache one second chance and relays the answer that worked", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    // The first request after a backend restart can land before the host has
    // been mapped. The guide's rule is one retry, and the BFF owns it here so
    // all four routes get it from the same place.
    const session = envelopeObj({ ...sessionData, refreshToken: "refresh-1" });
    let calls = 0;
    const fetchMock = stubFetch(() => {
      calls += 1;
      return calls === 1
        ? problemResponse({ status: 404, title: "Tenant Not Found", detail: "host not mapped yet" }, 404)
        : jsonResponse(JSON.stringify(session));
    });

    const relayed = await forwardToTenant("/api/v1/auth/otp/verify", {
      body: { challengeId: "ch-1", code: "123456", fullName: "Nawy Guest" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlsCalled(fetchMock)).toEqual([`${BASE}/api/v1/auth/otp/verify`, `${BASE}/api/v1/auth/otp/verify`]);
    // The retry is the same request, not a modified one: no tenant header, no
    // tenant field, and the code is not consumed by a question nobody answered.
    expect(jsonOf(fetchMock.mock.calls[1]?.[1])).toEqual(jsonOf(fetchMock.mock.calls[0]?.[1]));
    expect(tenantHeaderViolations(fetchMock)).toEqual([]);
    expect(tenantBodyViolations(fetchMock)).toEqual([]);
    // The forwarder stays a dumb relay: stripping the refresh token is the
    // route's job, and a test that expected it here would hide a leak.
    expect(relayed).toEqual({ status: 200, contentType: "application/json", body: session, retryAfterSeconds: null });
  });

  it("stops after one retry and relays the failure untouched", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const problem = { status: 404, title: "Tenant Not Found", detail: "No tenant is configured for this host." };
    const fetchMock = stubFetch(() => problemResponse(problem, 404));

    const relayed = await forwardToTenant("/api/v1/auth/refresh", { body: { refreshToken: "r-1" } });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(relayed).toEqual({
      status: 404,
      contentType: "application/problem+json",
      body: problem,
      retryAfterSeconds: null,
    });
  });

  it("relays every failure that is not a cold cache on the first answer", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const answers = [
      // A 404 about a phone number is the registration offer.
      () =>
        jsonResponse(
          envelope(null, {
            statusCode: 404,
            isSuccess: false,
            errors: { "Customer.NotFoundByPhone": "No customer exists for this phone number." },
          }),
          { status: 404 },
        ),
      // A dead refresh token is a signed-out customer, not a cold host.
      () =>
        jsonResponse(
          envelope(null, {
            statusCode: 401,
            isSuccess: false,
            errors: { "RefreshToken.Revoked": "The refresh token was revoked." },
          }),
          { status: 401 },
        ),
      // The deployed 500 is a missing database credential. Asking again cannot
      // configure it, and the stack trace must reach the log, not a second ask.
      () => textResponse("Database credential 'Database:MasterUser' is not configured.", 500, "text/plain"),
      () => jsonResponse(envelope(null, { statusCode: 409, isSuccess: false, errors: { "RefreshToken.AlreadyRevoked": "gone" } }), { status: 409 }),
    ];

    for (const answer of answers) {
      const fetchMock = stubFetch(answer);
      const relayed = await forwardToTenant("/api/v1/auth/refresh", { body: { refreshToken: "r-1" } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(relayed.status).not.toBe(200);
    }
  });

  it("shares one timeout budget with the rotation lock, just like the browser client", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    vi.useFakeTimers();
    const fetchMock = stubFetch(() => {
      vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);
      return problemResponse({ status: 404, title: "Tenant Not Found" }, 404);
    });

    const relayed = await forwardToTenant("/api/v1/auth/refresh", { body: { refreshToken: "r-1" } });

    // The cross-tab lock's TTL is sized from REQUEST_TIMEOUT_MS. A retry with
    // its own fresh budget would let this forwarder outlive the lock guarding
    // the very rotation it is performing.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(relayed.status).toBe(404);
  });
});

describe("apiErrorMessageKey", () => {
  /** Every code the integration guide documents, as of the current contract. */
  const CATALOG: AuthErrorCode[] = [
    "Tenant.Unresolved",
    "Tenant.Conflicting",
    "Tenant.NotFound",
    "Customer.ChallengeNotFound",
    "Customer.NotFoundByPhone",
    "Customer.OtpAlreadyUsed",
    "Customer.OtpMaxAttemptsExceeded",
    "Customer.Blocked",
    "Customer.Inactive",
    "Customer.InvalidPhoneNumber",
    "Customer.InvalidOtpCode",
    "Customer.OtpExpired",
    "Auth.InvalidPurpose",
    "Auth.InvalidChannel",
    "Auth.InactiveAccount",
    "Auth.OtpRateLimitExceeded",
    "Validation.Failed",
    "RateLimit.Exceeded",
    "RefreshToken.Invalid",
    "RefreshToken.Expired",
    "RefreshToken.Revoked",
    "RefreshToken.CompromisedReuse",
    "RefreshToken.AlreadyRevoked",
    "RefreshToken.ExclusiveOwnerViolation",
  ];

  it("covers exactly the documented catalog, with no code silently dropped", () => {
    expect(Object.keys(AUTH_ERROR_MESSAGES).sort()).toEqual([...CATALOG].sort());
  });

  it("has an English translation for every Arabic message it can show", () => {
    for (const [code, message] of Object.entries(AUTH_ERROR_MESSAGES)) {
      expect(translate("en", message), `translation for ${code}`).not.toBe(message);
    }
  });

  it("answers a known code with its own message and never with the code, a stack or server text", () => {
    for (const code of CATALOG) {
      const error = new AppError({
        kind: "conflict",
        status: 409,
        code,
        problemDetail: "System.NullReferenceException at NawyOrders.CustomerLogin.Handler: object reference not set",
      });
      const message = apiErrorMessageKey(error);
      expect(message, code).toBe(AUTH_ERROR_MESSAGES[code]);
      expect(message).not.toContain(code);
      // Arabic copy carries no ASCII letters at all, so nothing from the server
      // — not a code, not an exception type, not a stack frame — can be in it.
      expect(message).not.toMatch(/[A-Za-z]/);
    }
  });

  it("keeps a code nobody documented from becoming an empty or technical message", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(envelope(null, { statusCode: 409, isSuccess: false, errors: { "Payment.Declined": "Card declined." } }), {
        status: 409,
      }),
    );

    const error = await failureFor(fetchBranding());
    expect(error).toMatchObject({ kind: "conflict", code: "Payment.Declined" });
    const message = apiErrorMessageKey(error);
    expect(message).toBe("الكود ده اتستخدم خلاص، اطلب كود جديد");
    expect(message).not.toContain("Payment.Declined");
  });

  it("prefers the field message the backend's PascalCase key names", () => {
    const fieldKey = (field: string) => apiErrorMessageKey(new AppError({ kind: "validation", status: 422, fieldErrors: { [field]: "raw server text" } }));
    expect(fieldKey("PhoneNumber")).toBe("رقم الموبايل غير صحيح");
    expect(fieldKey("Code")).toBe("الكود غير صحيح، جرب تاني");
    expect(fieldKey("ChallengeId")).toBe("انتهت صلاحية الكود، اطلب كود جديد");
    expect(fieldKey("FullName")).toBe("اكتب اسمك بالكامل");
    expect(fieldKey("Purpose")).toBe("طلب غير صحيح، جرب تاني");
    expect(fieldKey("Channel")).toBe("طلب غير صحيح، جرب تاني");
    expect(fieldKey("RefreshToken")).toBe("انتهت الجلسة، سجّل الدخول تاني");
  });

  it("does not trust a camelCase key the contract never used", () => {
    // The API's validation dictionary is written in PascalCase C# property
    // names; a camelCase one is not a key this client was told about, so the
    // customer gets the honest "the request is wrong" sentence instead.
    const error = new AppError({ kind: "validation", status: 422, fieldErrors: { phoneNumber: "x" } });
    expect(apiErrorMessageKey(error)).toBe(AUTH_ERROR_MESSAGES["Validation.Failed"]);
  });

  it("lets a domain code win over the field message, because the code is what names the action", () => {
    // `Customer.OtpExpired` already tells the customer what to do next; a
    // `Code` key riding along with it must not downgrade it to a field sentence.
    const expired = new AppError({
      kind: "validation",
      status: 422,
      code: "Customer.OtpExpired",
      fieldErrors: { Code: "x" },
    });
    expect(apiErrorMessageKey(expired)).toBe(AUTH_ERROR_MESSAGES["Customer.OtpExpired"]);

    // A field key the catalog does not know leaks nothing: `Validation.Failed`
    // stays the generic sentence, and nothing gets highlighted on the form.
    const unknown = new AppError({
      kind: "validation",
      status: 422,
      code: "Validation.Failed",
      fieldErrors: { Mystery: "x" },
    });
    expect(apiErrorMessageKey(unknown)).toBe(AUTH_ERROR_MESSAGES["Validation.Failed"]);
    expect(apiErrorFieldTarget(unknown)).toBeNull();
  });

  it("reads a bare status as the tenant problem it documents", () => {
    // Tenant-resolution failures arrive as ProblemDetails with no code the
    // client can read, so the status is all there is to go on.
    expect(apiErrorMessageKey(new AppError({ kind: "notFound", status: 404 }))).toBe(AUTH_ERROR_MESSAGES["Tenant.NotFound"]);
    expect(apiErrorMessageKey(new AppError({ kind: "unauthorized", status: 400 }))).toBe(AUTH_ERROR_MESSAGES["Tenant.Unresolved"]);
    expect(
      apiErrorMessageKey(new AppError({ kind: "validation", status: 400, problemDetail: "tenant host mismatch" })),
    ).toBe(AUTH_ERROR_MESSAGES["Tenant.Conflicting"]);
    expect(
      apiErrorMessageKey(new AppError({ kind: "notFound", status: 404, problemDetail: "the subdomain is unknown" })),
    ).toBe(AUTH_ERROR_MESSAGES["Tenant.NotFound"]);
    // A 404 that is not a tenant problem still has to say something in Arabic.
    expect(apiErrorMessageKey(new AppError({ kind: "server", status: 404, problemDetail: "disk full" }))).toBe(
      "حصل مشكلة في السيرفر، جرب تاني",
    );
    // A tenant problem the middleware reported with a server kind is still the
    // store being missing, not a configuration conflict.
    expect(
      apiErrorMessageKey(new AppError({ kind: "server", status: 404, problemDetail: "Tenant host not mapped" })),
    ).toBe(AUTH_ERROR_MESSAGES["Tenant.NotFound"]);
  });

  it("has an Arabic sentence for every failure kind", () => {
    const expected: Record<AppErrorKind, string> = {
      offline: "مفيش اتصال بالإنترنت، جرب تاني",
      timeout: "السيرفر بياخد وقت طويل، جرب تاني",
      validation: "بيانات الطلب غير صحيحة",
      unauthorized: "انتهت الجلسة، سجّل الدخول تاني",
      notFound: "الكود غير صحيح، جرب تاني",
      conflict: "الكود ده اتستخدم خلاص، اطلب كود جديد",
      rateLimited: "عدد محاولات زايد، استنى شوية وجرب تاني",
      server: "حصل مشكلة في السيرفر، جرب تاني",
      envelope: "رد السيرفر مش مفهوم، جرب تاني",
    };
    for (const kind of Object.keys(expected) as AppErrorKind[]) {
      expect(apiErrorMessageKey(new AppError({ kind, status: 0 })), kind).toBe(expected[kind]);
    }
  });

  it("falls back to the kind message for a dotted key it has never seen", () => {
    // A domain-shaped key is not a validation field, so it cannot point the
    // customer at an input; the generic sentence is the honest answer.
    const error = new AppError({ kind: "validation", status: 0, fieldErrors: { "Some.Future": "raw server text" } });
    expect(apiErrorMessageKey(error)).toBe(AUTH_ERROR_MESSAGES["Validation.Failed"]);
  });

  it("never leaks an unexpected exception message to the customer", () => {
    expect(apiErrorMessageKey(new Error("connection string leaked"))).toBe("حصل مشكلة في السيرفر، جرب تاني");
    expect(apiErrorMessageKey(null)).toBe("حصل مشكلة في السيرفر، جرب تاني");
    expect(apiErrorMessageKey("RateLimit.Exceeded")).toBe("حصل مشكلة في السيرفر، جرب تاني");
  });
});

describe("apiErrorFieldTarget", () => {
  const withFieldErrors = (fieldErrors: Record<string, string>) =>
    new AppError({ kind: "validation", status: 422, code: "Validation.Failed", fieldErrors });

  it("says which input the server actually meant", () => {
    expect(apiErrorFieldTarget(withFieldErrors({ PhoneNumber: "x" }))).toBe("phone");
    expect(apiErrorFieldTarget(withFieldErrors({ Code: "x" }))).toBe("code");
    expect(apiErrorFieldTarget(withFieldErrors({ ChallengeId: "x" }))).toBe("code");
    expect(apiErrorFieldTarget(withFieldErrors({ FullName: "x" }))).toBe("name");
    expect(apiErrorFieldTarget(withFieldErrors({ Purpose: "x" }))).toBe("channel");
    expect(apiErrorFieldTarget(withFieldErrors({ Channel: "x" }))).toBe("channel");
    // A token failure belongs to the session, not to a box on the form.
    expect(apiErrorFieldTarget(withFieldErrors({ RefreshToken: "x" }))).toBe("none");
  });

  it("names no field when the failure is not about one", () => {
    expect(apiErrorFieldTarget(withFieldErrors({ Mystery: "x" }))).toBeNull();
    expect(apiErrorFieldTarget(new AppError({ kind: "rateLimited", status: 429 }))).toBeNull();
    expect(apiErrorFieldTarget(new Error("not an API failure"))).toBeNull();
  });

  it("maps every key the message table knows about", () => {
    expect(Object.keys(AUTH_FIELD_TARGETS).sort()).toEqual(Object.keys(AUTH_FIELD_MESSAGES).sort());
    for (const field of Object.keys(AUTH_FIELD_TARGETS)) {
      expect(apiErrorFieldTarget(withFieldErrors({ [field]: "x" }))).toBe(AUTH_FIELD_TARGETS[field]);
    }
  });
});

describe("verifyOtp status fields", () => {
  it("carries the API's nextStep and profileCompleted through", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(
        envelope({
          ...sessionData,
          isNewCustomer: true,
          isPhoneVerified: true,
          isEmailVerified: false,
          profileCompleted: false,
          nextStep: "CompleteProfile",
        }),
      ),
    );

    await expect(verifyOtp({ challengeId: "ch-1", code: "123456" })).resolves.toMatchObject({
      profileCompleted: false,
      nextStep: "CompleteProfile",
      isNewCustomer: true,
      isPhoneVerified: true,
    });
  });

  it("does not invent a status the API did not send", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() => jsonResponse(envelope(sessionData)));

    const session = await verifyOtp({ challengeId: "ch-1", code: "123456" });
    expect(session).not.toHaveProperty("profileCompleted");
    expect(session).not.toHaveProperty("nextStep");
  });
});

describe("splitFullName", () => {
  it("keeps everything after the first word as the last name", () => {
    expect(splitFullName("Ahmed Mohamed Ali")).toEqual({ firstName: "Ahmed", lastName: "Mohamed Ali" });
    expect(splitFullName("  Nawy   Guest  ")).toEqual({ firstName: "Nawy", lastName: "Guest" });
    expect(splitFullName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
    expect(splitFullName("   ")).toEqual({ firstName: "", lastName: "" });
  });
});

describe("completeProfile", () => {
  const profileData = {
    customerId: "c-1",
    phoneNumber: PHONE,
    firstName: "Ahmed",
    lastName: "Mohamed",
    fullName: "Ahmed Mohamed",
    email: "ahmed@example.com",
    isPhoneVerified: true,
    isEmailVerified: false,
    profileCompleted: true,
    nextStep: "Home",
  };
  const completedData = {
    profile: profileData,
    session: {
      accessToken: "access-2",
      tokenType: "Bearer",
      expiresIn: 900,
      expiresAtUtc: "2026-11-05T11:00:00Z",
      refreshTokenExpiresAtUtc: "2026-11-19T11:00:00Z",
    },
  };

  it("posts the access token and the trimmed name through the BFF", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(completedData)));

    await expect(
      completeProfile({
        accessToken: "access-1",
        firstName: " Ahmed ",
        lastName: " Mohamed ",
        email: " ahmed@example.com ",
      }),
    ).resolves.toEqual(completedData);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/profile");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({
      accessToken: "access-1",
      firstName: "Ahmed",
      lastName: "Mohamed",
      email: "ahmed@example.com",
    });
  });

  it("leaves a blank email out and rejects an answer with no access token", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    const fetchMock = stubFetch(() =>
      jsonResponse(envelope({ ...completedData, session: { ...completedData.session, accessToken: "" } })),
    );

    const error = await failureFor(completeProfile({ accessToken: "access-1", firstName: "A", lastName: "B" }));
    expect(error).toMatchObject({ kind: "envelope" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).not.toHaveProperty("email");
  });

  it("keeps the rotated refresh token out of JavaScript", async () => {
    vi.stubEnv(TENANT_API_BASE_URL_ENV, BASE);
    stubFetch(() =>
      jsonResponse(envelope({ ...completedData, session: { ...completedData.session, refreshToken: "refresh-2" } })),
    );

    const result = await completeProfile({ accessToken: "access-1", firstName: "A", lastName: "B" });
    expect(result.session).not.toHaveProperty("refreshToken");
  });
});
